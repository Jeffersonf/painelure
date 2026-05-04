param(
  [string]$SourceFolder,
  [string]$YearSuffix = "26",
  [string]$NumberPlaceholder = "{{REDE_NUMERO}}",
  [string]$DatePlaceholder = "{{REDE_DATA}}",
  [string]$HeadingPlaceholder = "{{REDE_CABECALHO}}",
  [string]$AssuntoLabel = "Assunto:",
  [string]$StartNumber = "",
  [string]$RedeDate = "",
  [switch]$WordVisible
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Select-Folder {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "Selecione a pasta com as redes"
  $dialog.UseDescriptionForTitle = $true
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    return $dialog.SelectedPath
  }
  throw "Nenhuma pasta foi selecionada."
}

function Convert-IsoDateToBr {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }
  $parsed = [datetime]::MinValue
  if ([datetime]::TryParse($Value, [ref]$parsed)) {
    return $parsed.ToString("dd/MM/yyyy")
  }
  return $Value
}

function New-RedeMetadata {
  param(
    [Parameter(Mandatory = $true)][string]$Sequence,
    [Parameter(Mandatory = $true)][string]$YearSuffix,
    [Parameter(Mandatory = $true)][string]$Date
  )

  $networkNumber = if ($YearSuffix) { "$Sequence/$YearSuffix" } else { $Sequence }
  [pscustomobject]@{
    Sequence = $Sequence
    YearSuffix = $YearSuffix
    Date = $Date
    NetworkNumber = $networkNumber
    Heading = "Rede n° $networkNumber Data: $Date"
  }
}

function Get-RedeMetadataFromText {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$FallbackYearSuffix
  )

  $regex = [regex]'(?i)rede\s*n.?\.?\s*(\d+)(?:\s*/\s*(\d{2,4}))?.*?data[:\s]*(\d{2}/\d{2}/\d{4})'
  $match = $regex.Match($Text)
  if (-not $match.Success) {
    return $null
  }

  $sequence = $match.Groups[1].Value
  $yearSuffix = if ($match.Groups[2].Success) { $match.Groups[2].Value } else { $FallbackYearSuffix }
  $date = $match.Groups[3].Value
  return New-RedeMetadata -Sequence $sequence -YearSuffix $yearSuffix -Date $date
}

function Get-RedeMetadataFromFileName {
  param(
    [Parameter(Mandatory = $true)][string]$FileName,
    [Parameter(Mandatory = $true)][string]$FallbackYearSuffix,
    [string]$DefaultDate
  )

  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
  if ($baseName -match '^\s*(\d+)\s*$') {
    $date = if ($DefaultDate) { $DefaultDate } else { Get-Date -Format "dd/MM/yyyy" }
    return New-RedeMetadata -Sequence $matches[1] -YearSuffix $FallbackYearSuffix -Date $date
  }
  return Get-RedeMetadataFromText -Text $FileName -FallbackYearSuffix $FallbackYearSuffix
}

function Replace-TextInDocument {
  param(
    [Parameter(Mandatory = $true)]$Document,
    [Parameter(Mandatory = $true)][string]$FindText,
    [Parameter(Mandatory = $true)][string]$ReplaceText
  )

  if ([string]::IsNullOrWhiteSpace($FindText)) {
    return
  }

  foreach ($storyRange in $Document.StoryRanges) {
    $range = $storyRange
    while ($null -ne $range) {
      $find = $range.Find
      $find.ClearFormatting() | Out-Null
      $find.Replacement.ClearFormatting() | Out-Null
      $find.Text = $FindText
      $find.Replacement.Text = $ReplaceText
      $find.Forward = $true
      $find.Wrap = 1
      $find.Format = $false
      $find.MatchCase = $false
      $find.MatchWholeWord = $false
      $find.MatchWildcards = $false
      $find.Execute($FindText, $false, $false, $false, $false, $false, $true, 1, $false, $ReplaceText, 2) | Out-Null
      $range = $range.NextStoryRange
    }
  }
}

function Replace-RedeHeadingInDocument {
  param(
    [Parameter(Mandatory = $true)]$Document,
    [Parameter(Mandatory = $true)][string]$Heading
  )

  $regex = [regex]'(?i)rede\s*n.?\.?\s*\d+(?:\s*/\s*\d{2,4})?.*?data[:\s]*\d{2}/\d{2}/\d{4}'
  foreach ($paragraph in $Document.Paragraphs) {
    $text = $paragraph.Range.Text.Trim()
    if ($regex.IsMatch($text)) {
      $range = $paragraph.Range
      if ($range.End -gt $range.Start) {
        $range.End = $range.End - 1
      }
      $range.Text = $Heading
      return $true
    }
  }
  return $false
}

function Get-AssuntoFromDocument {
  param(
    [Parameter(Mandatory = $true)]$Document,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $content = $Document.Content.Text
  $escapedLabel = [regex]::Escape($Label)
  $pattern = "(?im)^\s*$escapedLabel\s*(.+)$"
  $match = [regex]::Match($content, $pattern)
  if ($match.Success) {
    return $match.Groups[1].Value.Trim()
  }
  return ""
}

if (-not $SourceFolder) {
  $SourceFolder = Select-Folder
}

$resolvedFolder = (Resolve-Path -LiteralPath $SourceFolder).Path
$word = $null
$results = New-Object System.Collections.Generic.List[object]

try {
  $documents = @(Get-ChildItem -LiteralPath $resolvedFolder -File | Where-Object { $_.Extension -match '^\.(doc|docx)$' } | Sort-Object Name)
  if (-not $documents.Count) {
    throw "Nenhum arquivo .doc ou .docx foi encontrado na pasta: $resolvedFolder"
  }

  $word = New-Object -ComObject Word.Application
  $word.Visible = [bool]$WordVisible
  $word.DisplayAlerts = 0

  $sequenceCounter = if ($StartNumber) { [int]$StartNumber } else { 0 }
  $dateOverride = Convert-IsoDateToBr $RedeDate

  foreach ($file in $documents) {
    $document = $word.Documents.Open($file.FullName)
    try {
      $metadata = Get-RedeMetadataFromFileName -FileName $file.Name -FallbackYearSuffix $YearSuffix -DefaultDate $dateOverride
      if ($null -eq $metadata) {
        $metadata = Get-RedeMetadataFromText -Text $document.Content.Text -FallbackYearSuffix $YearSuffix
      }

      if ($StartNumber) {
        $date = if ($dateOverride) { $dateOverride } elseif ($metadata) { $metadata.Date } else { Get-Date -Format "dd/MM/yyyy" }
        $metadata = New-RedeMetadata -Sequence ([string]$sequenceCounter) -YearSuffix $YearSuffix -Date $date
        $sequenceCounter += 1
      }
      elseif ($dateOverride -and $metadata) {
        $metadata = New-RedeMetadata -Sequence $metadata.Sequence -YearSuffix $metadata.YearSuffix -Date $dateOverride
      }

      if ($null -eq $metadata) {
        Write-Warning "Ignorado por nao encontrar numero da rede: $($file.Name)"
        continue
      }

      Replace-TextInDocument -Document $document -FindText $NumberPlaceholder -ReplaceText $metadata.NetworkNumber
      Replace-TextInDocument -Document $document -FindText $DatePlaceholder -ReplaceText $metadata.Date
      Replace-TextInDocument -Document $document -FindText $HeadingPlaceholder -ReplaceText $metadata.Heading
      Replace-RedeHeadingInDocument -Document $document -Heading $metadata.Heading | Out-Null

      $assunto = Get-AssuntoFromDocument -Document $document -Label $AssuntoLabel
      if ($assunto) {
        Set-Clipboard -Value $assunto
      }

      $baseTitle = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
      $safeBase = ("{0} - {1}" -f $metadata.Sequence, $baseTitle)
      $pdfPath = Join-Path $resolvedFolder ($safeBase + ".pdf")
      $document.Save()
      $document.ExportAsFixedFormat($pdfPath, 17)

      $results.Add([pscustomobject]@{
        arquivo = $file.Name
        rede = $metadata.NetworkNumber
        data = $metadata.Date
        assunto = $assunto
        pdf = [System.IO.Path]::GetFileName($pdfPath)
      }) | Out-Null

      Write-Host ("Processado: {0} | Rede {1} | {2}" -f $file.Name, $metadata.NetworkNumber, $metadata.Date)
      if ($assunto) {
        Write-Host ("Assunto: {0}" -f $assunto)
      }
    }
    finally {
      $document.Close()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    }
  }

  $csvPath = Join-Path $resolvedFolder "redes-processadas.csv"
  $results | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8
  Write-Host ""
  Write-Host ("Concluido. CSV salvo em: {0}" -f $csvPath)
}
finally {
  if ($null -ne $word) {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
