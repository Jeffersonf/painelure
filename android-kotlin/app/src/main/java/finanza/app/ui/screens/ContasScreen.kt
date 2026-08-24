package com.painelure.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.components.AccountRow
import com.painelure.app.ui.components.AccountUi
import com.painelure.app.ui.components.BillRow
import com.painelure.app.ui.components.BillUi
import com.painelure.app.ui.components.CircularProgressRing
import com.painelure.app.ui.theme.HeroCard
import com.painelure.app.ui.theme.HeroCardSecondaryText
import com.painelure.app.ui.theme.AccentLime
import com.painelure.app.ui.components.ProfilePill

@Composable
fun ContasScreen(
    userName: String,
    period: String,
    total: String,
    progress: Float,
    paid: String,
    remaining: String,
    accounts: List<AccountUi>,
    bills: List<BillUi>,
    onNewAccount: () -> Unit,
    onTransfer: () -> Unit,
    onAccount: (String) -> Unit,
    onBill: (Long) -> Unit,
    onProfile: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 92.dp)
    ) {
        item {
            ProfilePill(userName, onProfile)
            Spacer(Modifier.height(10.dp))
            Text("Contas", style = MaterialTheme.typography.headlineMedium)
            Text("Corrente, poupança, cartão", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.58f))
            Spacer(Modifier.height(10.dp))
            Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primary, onClick = onNewAccount) {
                Text("+ Nova Conta", modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.labelLarge, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AccountMetric("Patrimônio", total, if (total.contains("-")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary, Modifier.weight(1f), "${accounts.size} contas")
                AccountMetric("Cartões", accounts.count { it.iconKey == "credit" }.toString(), MaterialTheme.colorScheme.tertiary, Modifier.weight(1f), "ciclos ativos")
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AccountMetric("Pago no mes", paid, MaterialTheme.colorScheme.secondary, Modifier.weight(1f))
                AccountMetric("A vencer", remaining, MaterialTheme.colorScheme.primary, Modifier.weight(1f), period)
            }
            Spacer(Modifier.height(14.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(Modifier.padding(14.dp)) {
                    Text("Central de contas", style = MaterialTheme.typography.titleMedium)
                    Text("Saldos, cartões e rendimento em um lugar só", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    if (accounts.isEmpty()) Text("Nenhuma conta cadastrada.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 14.dp))
                    accounts.forEach { item -> AccountRow(item) { onAccount(item.id) } }
                }
            }
        }
        item {
            Spacer(Modifier.height(12.dp))
            Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                Column(Modifier.padding(14.dp)) {
                    Text("Transferência", style = MaterialTheme.typography.titleMedium)
                    Text("Mova saldo entre suas contas", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedButton(onClick = onTransfer, modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) { Text("Transferir") }
                }
            }
        }
    }
}

@Composable
private fun AccountMetric(label: String, value: String, accent: Color, modifier: Modifier, detail: String = "") {
    Surface(modifier = modifier, shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(13.dp)) {
            Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleMedium, color = accent, modifier = Modifier.padding(top = 5.dp), maxLines = 1)
            if (detail.isNotBlank()) Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp), maxLines = 1)
        }
    }
}

