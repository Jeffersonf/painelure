package com.painelure.app

import java.text.Normalizer
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs

internal data class FinanzaImportedTransaction(
    val id: Long,
    val description: String,
    val category: String,
    val amount: Double,
    val type: String,
    val date: String,
    val accountId: String,
    val sourceId: String = ""
)

internal object FinanzaImportParser {
    fun parse(raw: String, accountId: String, today: LocalDate = LocalDate.now()): List<FinanzaImportedTransaction> =
        if (raw.contains("<OFX", ignoreCase = true) || raw.contains("<STMTTRN>", ignoreCase = true)) {
            parseOfx(raw, accountId, today)
        } else {
            parseCsv(raw, accountId, today)
        }

    fun parseOfx(raw: String, accountId: String, today: LocalDate = LocalDate.now()): List<FinanzaImportedTransaction> {
        val blocks = Regex(
            "<STMTTRN>(.*?)(?=</STMTTRN>|<STMTTRN>|</BANKTRANLIST>|</CCSTMTRS>)",
            setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)
        ).findAll(raw)
        return blocks.mapNotNull { match ->
            val block = match.groupValues[1]
            fun tag(name: String) = Regex("<$name>([^<\\r\\n]+)", RegexOption.IGNORE_CASE)
                .find(block)?.groupValues?.get(1)?.trim().orEmpty()
            val signed = parseAmount(tag("TRNAMT")) ?: return@mapNotNull null
            val sourceId = tag("FITID")
            val rawDate = tag("DTPOSTED").filter(Char::isDigit).take(8)
            val date = if (rawDate.length == 8) {
                "${rawDate.take(4)}-${rawDate.substring(4, 6)}-${rawDate.takeLast(2)}"
            } else today.toString()
            imported(
                stableId(sourceId.ifBlank { "$date|$signed|${tag("NAME")}|${tag("MEMO")}" }),
                tag("NAME").ifBlank { tag("MEMO") }.ifBlank { "Importado OFX" },
                "A classificar", signed, date, accountId, sourceId
            )
        }.toList()
    }

    fun parseCsv(raw: String, accountId: String, today: LocalDate = LocalDate.now()): List<FinanzaImportedTransaction> {
        val records = parseRecords(raw).filter { record -> record.any(String::isNotBlank) }
        if (records.size < 2) return emptyList()
        val headers = records.first().map(::normalizeHeader)
        fun column(vararg names: String) = headers.indexOfFirst { header -> names.any { header.contains(it) } }
        val dateIndex = column("data", "date")
        val descriptionIndex = column("descricao", "description", "historico", "lancamento", "nome", "memo")
        val amountIndex = column("valor", "amount", "total", "quantia")
        val typeIndex = column("tipo", "type", "natureza")
        val categoryIndex = column("categoria", "category")
        val idIndex = column("fitid", "identificador", "transaction id", "id")
        if (amountIndex < 0) return emptyList()
        return records.drop(1).mapIndexedNotNull { index, cells ->
            val signed = parseAmount(cells.getOrNull(amountIndex).orEmpty()) ?: return@mapIndexedNotNull null
            if (signed == 0.0) return@mapIndexedNotNull null
            val explicitType = normalizeHeader(cells.getOrNull(typeIndex).orEmpty())
            val sourceId = cells.getOrNull(idIndex).orEmpty().trim()
            val description = cells.getOrNull(descriptionIndex).orEmpty().trim().ifBlank { "Importado CSV" }
            val date = parseDate(cells.getOrNull(dateIndex).orEmpty(), today)
            val typeSign = when {
                explicitType.contains("receita") || explicitType.contains("income") || explicitType.contains("entrada") -> abs(signed)
                explicitType.contains("gasto") || explicitType.contains("expense") || explicitType.contains("saida") -> -abs(signed)
                else -> signed
            }
            imported(
                stableId(sourceId.ifBlank { "$date|$typeSign|$description|$index" }),
                description,
                cells.getOrNull(categoryIndex).orEmpty().trim().ifBlank { "A classificar" },
                typeSign, date, accountId, sourceId
            )
        }
    }

    private fun imported(id: Long, description: String, category: String, signed: Double, date: String, accountId: String, sourceId: String) =
        FinanzaImportedTransaction(id, description, category, abs(signed), if (signed >= 0.0) "income" else "expense", date, accountId, sourceId)

    private fun parseRecords(raw: String): List<List<String>> {
        val firstLine = raw.lineSequence().firstOrNull { it.isNotBlank() }.orEmpty()
        val separator = if (firstLine.count { it == ';' } >= firstLine.count { it == ',' }) ';' else ','
        val rows = mutableListOf<List<String>>()
        val row = mutableListOf<String>()
        val cell = StringBuilder()
        var quoted = false
        var index = 0
        while (index < raw.length) {
            val char = raw[index]
            when {
                char == '"' && quoted && index + 1 < raw.length && raw[index + 1] == '"' -> { cell.append('"'); index++ }
                char == '"' -> quoted = !quoted
                char == separator && !quoted -> { row += cell.toString(); cell.clear() }
                (char == '\n' || char == '\r') && !quoted -> {
                    if (char == '\r' && index + 1 < raw.length && raw[index + 1] == '\n') index++
                    row += cell.toString(); cell.clear()
                    if (row.any(String::isNotBlank)) rows += row.toList()
                    row.clear()
                }
                else -> cell.append(char)
            }
            index++
        }
        if (cell.isNotEmpty() || row.isNotEmpty()) {
            row += cell.toString()
            if (row.any(String::isNotBlank)) rows += row.toList()
        }
        return rows
    }

    private fun parseAmount(raw: String): Double? {
        val clean = raw.replace("R$", "", ignoreCase = true).replace(" ", "").trim()
        if (clean.isBlank()) return null
        val negativeByParentheses = clean.startsWith('(') && clean.endsWith(')')
        val unsigned = clean.removePrefix("(").removeSuffix(")")
        val normalized = if (unsigned.contains(',') && unsigned.lastIndexOf(',') > unsigned.lastIndexOf('.')) {
            unsigned.replace(".", "").replace(',', '.')
        } else unsigned.replace(",", "")
        val value = normalized.toDoubleOrNull() ?: return null
        return if (negativeByParentheses) -abs(value) else value
    }

    private fun parseDate(raw: String, fallback: LocalDate): String {
        val value = raw.trim().substringBefore('T').substringBefore(' ').take(10)
        val formats = listOf(DateTimeFormatter.ISO_LOCAL_DATE, DateTimeFormatter.ofPattern("dd/MM/yyyy"), DateTimeFormatter.ofPattern("dd-MM-yyyy"), DateTimeFormatter.ofPattern("MM/dd/yyyy"))
        return formats.firstNotNullOfOrNull { format -> runCatching { LocalDate.parse(value, format).toString() }.getOrNull() } ?: fallback.toString()
    }

    private fun normalizeHeader(raw: String): String = Normalizer.normalize(raw.trim().lowercase(Locale.ROOT), Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "").replace('_', ' ')

    private fun stableId(seed: String): Long = abs(seed.hashCode().toLong()).takeIf { it > 0L } ?: 1L
}

