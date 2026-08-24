package com.painelure.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.components.BillRow
import com.painelure.app.ui.components.BillUi
import com.painelure.app.ui.components.BillStatus
import com.painelure.app.ui.components.ProfilePill
import com.painelure.app.ui.theme.AccentPurple
import com.painelure.app.ui.theme.DangerRed
import com.painelure.app.ui.theme.SuccessGreen

@Composable
fun FutureScreen(
    userName: String,
    total: String,
    bills: List<BillUi>,
    onAdd: () -> Unit,
    onBill: (Long) -> Unit,
    onProfile: () -> Unit
) {
    var filter by remember { mutableStateOf("Todos") }
    val visible = when (filter) {
        "Atrasados" -> bills.filter { it.status == BillStatus.ATRASADO }
        "Pendentes" -> bills.filter { it.status == BillStatus.PENDENTE }
        else -> bills
    }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 92.dp)
    ) {
        item {
            ProfilePill(userName, onProfile)
            Spacer(Modifier.height(10.dp))
            Text("Vencimentos", style = MaterialTheme.typography.headlineLarge)
            Text("Contas futuras e compromissos", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.58f))
            Spacer(Modifier.height(10.dp))
            Surface(
                modifier = Modifier.fillMaxWidth().clickable(onClick = onAdd),
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.primary
            ) {
                Row(Modifier.padding(vertical = 11.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Add, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary)
                    Text("Novo", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.labelLarge)
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FutureMetric("Compromissos", total, AccentPurple, Modifier.weight(1f), "${bills.size} itens")
                FutureMetric("Próximo", bills.firstOrNull()?.due ?: "-", SuccessGreen, Modifier.weight(1f), bills.firstOrNull()?.name.orEmpty())
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FutureMetric("Pendentes", bills.count { it.status == BillStatus.PENDENTE }.toString(), MaterialTheme.colorScheme.tertiary, Modifier.weight(1f))
                FutureMetric("Vencidos", bills.count { it.status == BillStatus.ATRASADO }.toString(), DangerRed, Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Todos", "Pendentes", "Atrasados").forEach { option ->
                    val selected = filter == option
                    Surface(
                        modifier = Modifier.clickable { filter = option },
                        shape = RoundedCornerShape(99.dp),
                        color = if (selected) AccentPurple.copy(alpha = 0.16f) else MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, if (selected) AccentPurple.copy(alpha = 0.55f) else MaterialTheme.colorScheme.outlineVariant)
                    ) {
                        Text(option, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall, color = if (selected) AccentPurple else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Próximos vencimentos", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
        }
        if (visible.isEmpty()) item {
            Text("Nenhum vencimento cadastrado.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
        }
        items(visible, key = { it.id }) { bill -> BillRow(bill, onClick = { onBill(bill.id) }, modifier = Modifier.padding(bottom = 7.dp)) }
    }
}

@Composable
private fun FutureMetric(label: String, value: String, accent: androidx.compose.ui.graphics.Color, modifier: Modifier, detail: String = "") {
    Surface(modifier = modifier, shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(13.dp)) {
            Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleMedium, color = accent, modifier = Modifier.padding(top = 5.dp), maxLines = 1)
            if (detail.isNotBlank()) Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

