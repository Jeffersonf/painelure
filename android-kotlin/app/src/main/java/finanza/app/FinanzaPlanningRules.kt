package com.painelure.app

import java.time.LocalDate
import java.time.YearMonth

internal data class FinanzaPlanningTransaction(
    val type: String,
    val amount: Double,
    val category: String,
    val date: LocalDate,
    val paid: Boolean = false
)

internal data class FinanzaMonthTotals(val month: YearMonth, val income: Double, val expense: Double)

internal object FinanzaPlanningRules {
    fun budgetSpending(
        transactions: List<FinanzaPlanningTransaction>,
        month: YearMonth,
        today: LocalDate
    ): Map<String, Double> = transactions.asSequence()
        .filter { it.type == "expense" && !it.paid && !it.date.isAfter(today) && YearMonth.from(it.date) == month }
        .filterNot { it.category.equals("Transferencia", ignoreCase = true) }
        .groupBy { it.category.ifBlank { "Geral" } }
        .mapValues { (_, values) -> values.sumOf { it.amount } }

    fun monthTotals(
        transactions: List<FinanzaPlanningTransaction>,
        endMonth: YearMonth,
        count: Int = 6
    ): List<FinanzaMonthTotals> = (count - 1 downTo 0).map { offset ->
        val month = endMonth.minusMonths(offset.toLong())
        val items = transactions.filter { YearMonth.from(it.date) == month }
            .filterNot { it.category.equals("Transferencia", ignoreCase = true) }
        FinanzaMonthTotals(
            month,
            items.filter { it.type == "income" }.sumOf { it.amount },
            items.filter { it.type == "expense" }.sumOf { it.amount }
        )
    }
}

