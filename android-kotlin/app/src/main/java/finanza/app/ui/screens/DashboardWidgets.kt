@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.painelure.app.ui.screens

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Analytics
import androidx.compose.material.icons.rounded.BarChart
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.Restore
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.SpaceDashboard
import androidx.compose.material.icons.rounded.TrackChanges
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.painelure.app.features.FeatureCenterUiState
import com.painelure.app.FinanzaPreferences
import com.painelure.app.ui.components.AccountUi
import com.painelure.app.ui.components.BillRow
import com.painelure.app.ui.components.BillUi
import com.painelure.app.ui.components.HeroBalanceCard
import com.painelure.app.ui.components.TransactionRow
import com.painelure.app.ui.components.TransactionUi
import org.json.JSONArray
import org.json.JSONObject

private data class DashboardWidgetDef(
    val id: String,
    val title: String,
    val description: String,
    val group: String,
    val icon: ImageVector,
    val default: Boolean,
    val pinned: Boolean = false
)

private data class DashboardWidgetConfig(val active: Set<String>, val order: List<String>)

private val dashboardWidgetDefs = listOf(
    DashboardWidgetDef("workbench", "Atalhos do Finanza", "Entrada para as areas principais", "Apoio", Icons.Rounded.SpaceDashboard, true, true),
    DashboardWidgetDef("cards", "Resumo do dia a dia", "Saldo, entradas e gastos", "Essencial", Icons.Rounded.Analytics, true),
    DashboardWidgetDef("commitments", "Proximos vencimentos", "Contas e compromissos", "Essencial", Icons.AutoMirrored.Rounded.ReceiptLong, true),
    DashboardWidgetDef("quickactions", "Acoes rapidas", "Menos toques para lancar", "Essencial", Icons.Rounded.Bolt, true),
    DashboardWidgetDef("recent", "Ultimas transacoes", "Lancamentos recentes", "Essencial", Icons.Rounded.History, true),
    DashboardWidgetDef("accounts", "Saldos das contas", "Saldo de cada conta", "Apoio", Icons.Rounded.AccountBalanceWallet, false),
    DashboardWidgetDef("budgets", "Orcamentos rapidos", "Uso por categoria", "Apoio", Icons.Rounded.TrackChanges, false),
    DashboardWidgetDef("goals", "Metas rapidas", "Progresso das metas", "Apoio", Icons.Rounded.Flag, false),
    DashboardWidgetDef("barcats", "Ranking de gastos", "Categorias com maior peso", "Analise", Icons.Rounded.BarChart, false)
)

@Composable
fun DashboardWidgets(
    period: String,
    balance: String,
    income: String,
    spent: String,
    transactions: List<TransactionUi>,
    accounts: List<AccountUi>,
    bills: List<BillUi>,
    categories: List<CategoryUi>,
    features: FeatureCenterUiState,
    onAdd: () -> Unit,
    onAllTransactions: () -> Unit,
    onTransaction: (Long) -> Unit,
    onBill: (Long) -> Unit,
    onAccounts: () -> Unit,
    onAnalysis: () -> Unit,
    onFeatures: () -> Unit,
    onSettings: () -> Unit
) {
    val context = LocalContext.current
    var config by remember { mutableStateOf(loadDashboardWidgetConfig(context)) }
    var editing by remember { mutableStateOf(false) }

    fun update(next: DashboardWidgetConfig) {
        val normalized = normalizeDashboardWidgetConfig(next)
        config = normalized
        saveDashboardWidgetConfig(context, normalized)
    }

    DashboardManagerHeader(config.active.size, dashboardWidgetDefs.size) { editing = true }
    Spacer(Modifier.height(10.dp))
    config.order.filter(config.active::contains).forEach { id ->
        when (id) {
            "workbench" -> DashboardWorkbench(onAccounts, onAnalysis, onFeatures, onSettings)
            "cards" -> HeroBalanceCard("Disponivel", period, balance, income, spent)
            "commitments" -> DashboardBills(bills, onBill, onAccounts)
            "quickactions" -> DashboardQuickActions(onAdd, onAllTransactions, onAccounts)
            "recent" -> DashboardRecent(transactions, onTransaction, onAllTransactions)
            "accounts" -> DashboardAccounts(accounts, onAccounts)
            "budgets" -> DashboardFeatureList("Orcamentos", features, "budgets", MaterialTheme.colorScheme.primary, onFeatures)
            "goals" -> DashboardFeatureList("Metas", features, "goals", MaterialTheme.colorScheme.tertiary, onFeatures)
            "barcats" -> DashboardCategories(categories, onAnalysis)
        }
        Spacer(Modifier.height(10.dp))
    }

    if (editing) {
        DashboardWidgetManager(
            config = config,
            onDismiss = { editing = false },
            onUpdate = ::update
        )
    }
}

@Composable
private fun DashboardManagerHeader(active: Int, total: Int, onEdit: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "$active de $total widgets",
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedButton(onClick = onEdit, shape = RoundedCornerShape(12.dp)) {
            Icon(Icons.Rounded.Tune, contentDescription = null, modifier = Modifier.size(17.dp))
            Text("Editar", modifier = Modifier.padding(start = 6.dp))
        }
    }
}

@Composable
private fun DashboardWorkbench(onAccounts: () -> Unit, onAnalysis: () -> Unit, onFeatures: () -> Unit, onSettings: () -> Unit) {
    WidgetSurface("Atalhos do Finanza", "O que voce usa sempre", Icons.Rounded.SpaceDashboard) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WidgetAction("Contas", Icons.Rounded.AccountBalanceWallet, onAccounts, Modifier.weight(1f))
            WidgetAction("Analise", Icons.Rounded.Analytics, onAnalysis, Modifier.weight(1f))
            WidgetAction("Recursos", Icons.Rounded.GridView, onFeatures, Modifier.weight(1f))
            WidgetAction("Ajustes", Icons.Rounded.Settings, onSettings, Modifier.weight(1f))
        }
    }
}

@Composable
private fun DashboardQuickActions(onAdd: () -> Unit, onTransactions: () -> Unit, onAccounts: () -> Unit) {
    WidgetSurface("Acoes rapidas", "Menos toques para o dia a dia", Icons.Rounded.Bolt) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WidgetAction("Nova", Icons.Rounded.Add, onAdd, Modifier.weight(1f), true)
            WidgetAction("Gastos", Icons.Rounded.History, onTransactions, Modifier.weight(1f))
            WidgetAction("Contas", Icons.Rounded.AccountBalanceWallet, onAccounts, Modifier.weight(1f))
        }
    }
}

@Composable
private fun DashboardBills(items: List<BillUi>, onBill: (Long) -> Unit, onAll: () -> Unit) {
    WidgetSurface("Proximos vencimentos", "O que pede atencao", Icons.AutoMirrored.Rounded.ReceiptLong, onAll) {
        if (items.isEmpty()) WidgetEmpty("Nenhum vencimento pendente.")
        else items.take(3).forEach { BillRow(it, { onBill(it.id) }) }
    }
}

@Composable
private fun DashboardRecent(items: List<TransactionUi>, onItem: (Long) -> Unit, onAll: () -> Unit) {
    WidgetSurface("Ultimas transacoes", "Historico recente", Icons.Rounded.History, onAll) {
        if (items.isEmpty()) WidgetEmpty("Nenhuma transacao ainda.")
        else items.take(6).forEach { TransactionRow(it, { onItem(it.id) }) }
    }
}

@Composable
private fun DashboardAccounts(items: List<AccountUi>, onAll: () -> Unit) {
    WidgetSurface("Contas", "Saldos por conta", Icons.Rounded.AccountBalanceWallet, onAll) {
        if (items.isEmpty()) WidgetEmpty("Cadastre uma conta para acompanhar os saldos.")
        else items.take(5).forEachIndexed { index, item ->
            Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(34.dp).clip(CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.AccountBalanceWallet, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                Column(Modifier.weight(1f).padding(horizontal = 8.dp)) {
                    Text(item.name, style = MaterialTheme.typography.bodyMedium)
                    Text(item.type, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(item.amount, fontWeight = FontWeight.SemiBold)
            }
            if (index < items.take(5).lastIndex) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}

@Composable
private fun DashboardFeatureList(title: String, state: FeatureCenterUiState, moduleId: String, accent: Color, onAll: () -> Unit) {
    val items = state.modules.firstOrNull { it.id == moduleId }?.items.orEmpty()
    WidgetSurface(title, "Visao rapida", if (moduleId == "goals") Icons.Rounded.Flag else Icons.Rounded.TrackChanges, onAll) {
        if (items.isEmpty()) WidgetEmpty("Nenhum item cadastrado.")
        else items.take(4).forEach { item ->
            Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(item.title, style = MaterialTheme.typography.bodyMedium)
                    Text(item.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    item.progress?.let { value ->
                        Box(Modifier.fillMaxWidth().padding(top = 6.dp).height(5.dp).clip(CircleShape)) {
                            Surface(color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.matchParentSize()) {}
                            Surface(color = accent, modifier = Modifier.fillMaxWidth(value.coerceIn(0f, 1f)).height(5.dp)) {}
                        }
                    }
                }
                if (item.value.isNotBlank()) Text(item.value, color = accent, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun DashboardCategories(items: List<CategoryUi>, onAll: () -> Unit) {
    WidgetSurface("Ranking de gastos", "Categorias com maior peso", Icons.Rounded.BarChart, onAll) {
        if (items.isEmpty()) WidgetEmpty("Os gastos por categoria aparecerao aqui.")
        else items.take(6).forEach { item ->
            Row(Modifier.fillMaxWidth().padding(top = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(item.name, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                Text(item.amount, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
            }
            Box(Modifier.fillMaxWidth().padding(top = 4.dp).height(5.dp).clip(CircleShape)) {
                Surface(color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.matchParentSize()) {}
                Surface(color = item.color, modifier = Modifier.fillMaxWidth(item.share.coerceIn(0f, 1f)).height(5.dp)) {}
            }
        }
    }
}

@Composable
private fun WidgetSurface(title: String, subtitle: String, icon: ImageVector, onOpen: (() -> Unit)? = null, content: @Composable () -> Unit) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(19.dp))
                Column(Modifier.weight(1f).padding(start = 9.dp)) {
                    Text(title, style = MaterialTheme.typography.titleSmall)
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                onOpen?.let { IconButton(onClick = it) { Icon(Icons.Rounded.ChevronRight, contentDescription = "Abrir") } }
            }
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun WidgetAction(label: String, icon: ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier, primary: Boolean = false) {
    Surface(
        modifier = modifier.height(62.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(13.dp),
        color = if (primary) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(Modifier.padding(9.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = if (primary) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant)
            Text(label, style = MaterialTheme.typography.labelSmall, color = if (primary) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp), maxLines = 1)
        }
    }
}

@Composable
private fun WidgetEmpty(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 10.dp))
}

@Composable
private fun DashboardWidgetManager(config: DashboardWidgetConfig, onDismiss: () -> Unit, onUpdate: (DashboardWidgetConfig) -> Unit) {
    val maxHeight = LocalConfiguration.current.screenHeightDp.dp * 0.9f
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)) {
        Column(Modifier.fillMaxWidth().heightIn(max = maxHeight).verticalScroll(rememberScrollState()).padding(horizontal = 14.dp).padding(bottom = 28.dp)) {
            Text("Editar widgets", style = MaterialTheme.typography.titleLarge)
            Text("Escolha os blocos e a ordem da pagina inicial.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 3.dp, bottom = 12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                OutlinedButton(onClick = { onUpdate(defaultDashboardWidgetConfig(focused = true)) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("Essencial") }
                OutlinedButton(onClick = { onUpdate(config.copy(active = dashboardWidgetDefs.map { it.id }.toSet())) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("Todos") }
                IconButton(onClick = { onUpdate(defaultDashboardWidgetConfig()) }) { Icon(Icons.Rounded.Restore, contentDescription = "Restaurar") }
            }
            dashboardWidgetDefs.forEach { definition ->
                val index = config.order.indexOf(definition.id)
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.52f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(definition.icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        Column(Modifier.weight(1f).padding(horizontal = 9.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(definition.title, style = MaterialTheme.typography.labelLarge)
                                if (definition.pinned) Icon(Icons.Rounded.PushPin, contentDescription = "Fixo", modifier = Modifier.padding(start = 5.dp).size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text("${definition.group} | ${definition.description}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                        }
                        if (!definition.pinned) {
                            IconButton(onClick = { onUpdate(config.copy(order = moveDashboardWidget(config.order, definition.id, -1))) }, enabled = index > 1) { Icon(Icons.Rounded.KeyboardArrowUp, contentDescription = "Subir") }
                            IconButton(onClick = { onUpdate(config.copy(order = moveDashboardWidget(config.order, definition.id, 1))) }, enabled = index in 1 until config.order.lastIndex) { Icon(Icons.Rounded.KeyboardArrowDown, contentDescription = "Descer") }
                            Switch(
                                checked = definition.id in config.active,
                                onCheckedChange = { enabled ->
                                    val next = if (enabled) config.active + definition.id else config.active - definition.id
                                    if (enabled || next.size >= 3) onUpdate(config.copy(active = next))
                                }
                            )
                        }
                    }
                }
            }
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth().padding(top = 14.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                Text("Concluir")
            }
        }
    }
}

private fun moveDashboardWidget(order: List<String>, id: String, direction: Int): List<String> {
    val from = order.indexOf(id)
    val to = from + direction
    if (from <= 0 || to <= 0 || to !in order.indices) return order
    return order.toMutableList().apply { add(to, removeAt(from)) }
}

private fun defaultDashboardWidgetConfig(focused: Boolean = false): DashboardWidgetConfig {
    val active = dashboardWidgetDefs.filter { it.pinned || if (focused) it.id in setOf("cards", "commitments", "quickactions") else it.default }.map { it.id }.toSet()
    return DashboardWidgetConfig(active, dashboardWidgetDefs.map { it.id })
}

private fun normalizeDashboardWidgetConfig(config: DashboardWidgetConfig): DashboardWidgetConfig {
    val ids = dashboardWidgetDefs.map { it.id }
    val active = (config.active.intersect(ids.toSet()) + "workbench").toMutableSet()
    dashboardWidgetDefs.filter { it.default }.forEach { if (active.size < 3) active += it.id }
    val order = listOf("workbench") + config.order.filter { it in ids && it != "workbench" }.distinct() + ids.filter { it !in config.order && it != "workbench" }
    return DashboardWidgetConfig(active, order)
}

private fun loadDashboardWidgetConfig(context: Context): DashboardWidgetConfig {
    val prefs = FinanzaPreferences.get(context)
    val fallback = defaultDashboardWidgetConfig()
    return runCatching {
        val activeRaw = prefs.getString("dashboard_widget_active", null)
        val webPrefs = runCatching { JSONObject(prefs.getString("widget_prefs", "{}") ?: "{}") }.getOrDefault(JSONObject())
        val active = if (activeRaw != null) {
            val array = JSONArray(activeRaw)
            (0 until array.length()).map(array::getString).toSet()
        } else dashboardWidgetDefs.filter { webPrefs.optBoolean(it.id, it.default) || it.pinned }.map { it.id }.toSet()
        val orderArray = JSONArray(prefs.getString("dashboard_widget_order", prefs.getString("widget_order", null)) ?: return fallback)
        normalizeDashboardWidgetConfig(
            DashboardWidgetConfig(
                active,
                (0 until orderArray.length()).map(orderArray::getString)
            )
        )
    }.getOrDefault(fallback)
}

private fun saveDashboardWidgetConfig(context: Context, config: DashboardWidgetConfig) {
    val webPrefs = JSONObject().apply { dashboardWidgetDefs.forEach { put(it.id, it.id in config.active) } }
    FinanzaPreferences.get(context).edit()
        .putString("dashboard_widget_active", JSONArray(config.active.toList()).toString())
        .putString("dashboard_widget_order", JSONArray(config.order).toString())
        .putString("widget_prefs", webPrefs.toString())
        .putString("widget_order", JSONArray(config.order).toString())
        .apply()
}

