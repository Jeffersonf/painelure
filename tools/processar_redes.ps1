param(
  [string]$SourceFolder,
  [string]$YearSuffix = "26",
  [string]$NumberPlaceholder = "{{REDE_NUMERO}}",
  [string]$DatePlaceholder = "{{REDE_DATA}}",
  [string]$HeadingPlaceholder = "{{REDE_CABECALHO}}",
  [string]$AssuntoLabel = "Assunto:",
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

function Get-RedeMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FileName,
    [Parameter(Mandatory = $true)]
    [string]$FallbackYearSuffix
  )

  $regex = [regex]'rede\s*n[ºo°]?\s*(\d+)(?:\s*/\s*(\d{2,4}))?.*?data[:\s]*(\d{2}/\d{2}/\d{4})'
  $match = $regex.Match($FileName)
  if (-not $match.Success) {
    return $null
  }

  $sequence = $match.Groups[1].Value
  $yearSuffix = if ($match.Groups[2].Success) { $match.Groups[2].Value } else { $FallbackYearSuffix }
  $date = $match.Groups[3].Value

  [pscustomobject]@{
    Sequence = $sequence
    YearSuffix = $yearSuffix
    Date = $date
    NetworkNumber = if ($yearSuffix) { "$sequence/$yearSuffix" } else { $sequence }
    Heading = if ($yearSuffix) { "Rede nº $sequence/$yearSuffix Data: $date" } else { "Rede nº $sequence Data: $date" }
  }
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
$documents = @()
$results = New-Object System.Collections.Generic.List[object]

try {
  $documents = Get-ChildItem -LiteralPath $resolvedFolder -File | Where-Object { $_.Extension -match '^\.(doc|docx)$' } | Sort-Object Name
  if (-not $documents.Count) {
    throw "Nenhum arquivo .doc ou .docx foi encontrado na pasta: $resolvedFolder"
  }

  $word = New-Object -ComObject Word.Application
  $word.Visible = [bool]$WordVisible
  $word.DisplayAlerts = 0

  foreach ($file in $documents) {
    $metadata = Get-RedeMetadata -FileName $file.Name -FallbackYearSuffix $YearSuffix
    if ($null -eq $metadata) {
      Write-Warning "Ignorado por nao seguir o padrao esperado: $($file.Name)"
      continue
    }

    $newBaseName = $metadata.Sequence
    $newDocPath = Join-Path $resolvedFolder ($newBaseName + $file.Extension)
    if ($file.FullName -ne $newDocPath) {
      if (Test-Path -LiteralPath $newDocPath) {
        throw "Ja existe um arquivo com o nome de destino: $newDocPath"
      }
      Rename-Item -LiteralPath $file.FullName -NewName ($newBaseName + $file.Extension)
      $file = Get-Item -LiteralPath $newDocPath
    }

    $document = $word.Documents.Open($file.FullName)
    try {
      Replace-TextInDocument -Document $document -FindText $NumberPlaceholder -ReplaceText $metadata.NetworkNumber
      Replace-TextInDocument -Document $document -FindText $DatePlaceholder -ReplaceText $metadata.Date
      Replace-TextInDocument -Document $document -FindText $HeadingPlaceholder -ReplaceText $metadata.Heading

      $assunto = Get-AssuntoFromDocument -Document $document -Label $AssuntoLabel
      if ($assunto) {
        Set-Clipboard -Value $assunto
      }

      $pdfPath = Join-Path $resolvedFolder ($newBaseName + ".pdf")
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
