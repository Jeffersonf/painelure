package com.painelure.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.components.TransactionRow
import com.painelure.app.ui.components.TransactionUi
import com.painelure.app.ui.theme.SuccessGreen
import com.painelure.app.ui.components.ProfilePill

data class CategoryUi(val name: String, val amount: String, val share: Float, val color: Color)
data class MonthTrendUi(val label: String, val income: String, val spent: String, val incomeShare: Float, val spentShare: Float)

@Composable
fun AnalysisScreen(userName: String, income: String, spent: String, categories: List<CategoryUi>, trends: List<MonthTrendUi>, transactions: List<TransactionUi>, onTransaction: (Long) -> Unit, onProfile: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") }
    val visibleTransactions = remember(transactions, query, filter) {
        transactions.filter { item ->
            val matchesType = filter == "all" || (filter == "income" && item.income) || (filter == "expense" && !item.income)
            val normalized = query.trim().lowercase()
            matchesType && (normalized.isBlank() || item.title.lowercase().contains(normalized) || item.category.lowercase().contains(normalized))
        }
    }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 92.dp)
    ) {
        item {
            ProfilePill(userName, onProfile)
            Spacer(Modifier.height(10.dp))
            Text("Análise", style = MaterialTheme.typography.headlineMedium)
            Text("Entradas, saídas e ritmo do mês", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.58f))
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth()) {
                Summary("Entradas", income, Modifier.weight(1f))
                Spacer(Modifier.width(10.dp))
                Summary("Saídas", spent, Modifier.weight(1f))
            }
            Text("Últimos 6 meses", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
            trends.forEach { trend ->
                Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                    Row(Modifier.fillMaxWidth()) {
                        Text(trend.label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        Text("${trend.income} / ${trend.spent}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.56f))
                    }
                    Spacer(Modifier.height(5.dp))
                    Box(Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f))) {
                        Box(Modifier.fillMaxWidth(trend.incomeShare.coerceIn(0f, 1f)).height(5.dp).background(SuccessGreen))
                    }
                    Spacer(Modifier.height(3.dp))
                    Box(Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f))) {
                        Box(Modifier.fillMaxWidth(trend.spentShare.coerceIn(0f, 1f)).height(5.dp).background(MaterialTheme.colorScheme.error))
                    }
                }
            }
            Text("Por categoria", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
        }
        items(categories, key = { it.name }) { category ->
            Column(Modifier.fillMaxWidth().padding(vertical = 7.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(10.dp).clip(RoundedCornerShape(5.dp)).background(category.color))
                    Spacer(Modifier.width(9.dp))
                    Text(category.name, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                    Text(category.amount, style = MaterialTheme.typography.bodyMedium)
                }
                Spacer(Modifier.height(7.dp))
                Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))) {
                    Box(Modifier.fillMaxWidth(category.share.coerceIn(0f, 1f)).height(6.dp).background(category.color))
                }
            }
        }
        item {
            Text("Movimentos", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp, bottom = 6.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Buscar") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                textStyle = MaterialTheme.typography.bodyMedium
            )
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(7.dp)) {
                listOf("all" to "Todos", "expense" to "Gastos", "income" to "Receitas").forEach { (id, label) ->
                    FilterChip(selected = filter == id, onClick = { filter = id }, label = { Text(label) })
                }
            }
        }
        if (visibleTransactions.isEmpty()) item {
            Text("Nenhum movimento encontrado.", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.56f), modifier = Modifier.padding(vertical = 18.dp))
        }
        items(visibleTransactions, key = { it.id }) { item -> TransactionRow(item, { onTransaction(item.id) }) }
    }
}

@Composable
private fun Summary(label: String, value: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)).padding(13.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.56f))
        Text(value, style = MaterialTheme.typography.titleLarge, maxLines = 1)
    }
}

