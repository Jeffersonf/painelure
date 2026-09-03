@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.painelure.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import com.painelure.app.data.*
import com.painelure.app.ui.theme.Lime
import com.painelure.app.ui.theme.Muted
import com.painelure.app.ui.theme.PanelSurface
import com.painelure.app.ui.theme.Purple
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun ModuleCatalogDialog(modules: List<PanelModule>, repository: PainelRepository, token: String, onDismiss: () -> Unit) {
    var admin by remember { mutableStateOf<AdminOverview?>(null) }
    var panel by remember { mutableStateOf<PainelData?>(null) }
    var showAdmin by remember { mutableStateOf(false) }
    var showAdminManagement by remember { mutableStateOf(false) }
    var selectedRecords by remember { mutableStateOf<List<PanelRecord>?>(null) }
    LaunchedEffect(token) { admin = withContext(Dispatchers.IO) { repository.adminOverview(token) }.getOrNull() }
    LaunchedEffect(token) { panel = withContext(Dispatchers.IO) { repository.load(token) }.getOrNull() }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.padding(horizontal = 20.dp).heightIn(max = 680.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = MaterialTheme.shapes.small, color = Purple.copy(alpha = .14f)) {
                    Icon(Icons.Default.Apps, "Módulos", tint = Purple, modifier = Modifier.padding(10.dp).size(22.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("PAINELURE  /  CATÁLOGO", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text("Módulos disponíveis", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Escolha uma área para consultar os dados carregados.", color = Muted, style = MaterialTheme.typography.bodySmall)
                }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(9.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(modules, key = { it.key }) { module ->
                    ModuleCatalogCard(module, moduleCount(module, panel, admin)) {
                        if (module.key == "admin") showAdmin = true
                        selectedRecords = recordsFor(module, panel)
                    }
                }
            }
        }
    }
    if (showAdmin) AdminDetailsDialog(admin, onDismiss = { showAdmin = false }, onManage = { showAdminManagement = true })
    if (showAdminManagement) AdminManagementDialog(repository, token, onDismiss = { showAdminManagement = false })
    selectedRecords?.let { records -> ModuleRecordsDialog(records, onDismiss = { selectedRecords = null }) }
}

@Composable
private fun ModuleCatalogCard(module: PanelModule, count: String, onClick: () -> Unit) {
    val available = module.state != PanelModuleState.PLANNED
    val accent = if (available) Lime else Muted
    Card(Modifier.fillMaxWidth().clickable(enabled = available, onClick = onClick), shape = MaterialTheme.shapes.medium, colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .11f))) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = MaterialTheme.shapes.small, color = accent.copy(alpha = .13f)) {
                Icon(if (module.key == "admin") Icons.Default.AdminPanelSettings else Icons.Default.Storage, null, tint = accent, modifier = Modifier.padding(9.dp).size(19.dp))
            }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(module.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(moduleStateLabel(module.state), color = accent, style = MaterialTheme.typography.labelSmall)
                if (count.isNotBlank()) Text(count, color = Muted, style = MaterialTheme.typography.bodySmall)
            }
            Icon(Icons.Default.ChevronRight, "Abrir módulo", tint = Muted, modifier = Modifier.size(19.dp))
        }
    }
}

private fun moduleStateLabel(state: PanelModuleState) = when (state) {
    PanelModuleState.AVAILABLE -> "Disponível"
    PanelModuleState.READ_ONLY -> "Consulta / operação"
    PanelModuleState.PLANNED -> "Em migração"
}

private fun moduleCount(module: PanelModule, panel: PainelData?, admin: AdminOverview?): String = when (module.key) {
    "network" -> "${panel?.networks?.size ?: 0} registros carregados"
    "inventory" -> "${panel?.inventory?.size ?: 0} itens carregados"
    "supervision" -> "${panel?.supervisors?.size ?: 0} registros carregados"
    "contacts" -> "${panel?.contacts?.size ?: 0} contatos carregados"
    "calls", "ctc" -> "${panel?.calls?.size ?: 0} chamados carregados"
    "cars" -> "${panel?.cars?.size ?: 0} veículos carregados"
    "calendar", "rede-2026" -> "${panel?.calendar?.size ?: 0} eventos carregados"
    "admin" -> "${admin?.users?.size ?: 0} usuários · ${admin?.audit?.size ?: 0} auditorias"
    "satisfaction" -> "${panel?.satisfaction?.size ?: 0} respostas carregadas"
    "reports" -> "${panel?.reports?.size ?: 0} relatórios carregados"
    "bi-equipment" -> "${panel?.biEquipment?.size ?: 0} registros carregados"
    "internal" -> "${panel?.internal?.size ?: 0} registros carregados"
    "profiles" -> "${panel?.profiles?.size ?: 0} perfis carregados"
    "quality" -> "${panel?.quality?.size ?: 0} registros carregados"
    else -> ""
}

private fun recordsFor(module: PanelModule, panel: PainelData?): List<PanelRecord>? = when (module.key) {
    "network" -> panel?.networks
    "inventory" -> panel?.inventory?.map { PanelRecord(it.name, it.school, it.status) }
    "supervision" -> panel?.supervisors
    "contacts" -> panel?.contacts
    "calls", "ctc" -> panel?.calls
    "cars" -> panel?.cars
    "calendar", "rede-2026" -> panel?.calendar
    "satisfaction" -> panel?.satisfaction
    "reports" -> panel?.reports
    "bi-equipment" -> panel?.biEquipment
    "internal" -> panel?.internal
    "profiles" -> panel?.profiles
    "quality" -> panel?.quality
    else -> null
}

@Composable
private fun ModuleRecordsDialog(records: List<PanelRecord>, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.padding(horizontal = 20.dp).heightIn(max = 680.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("PAINELURE  /  DADOS", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text("Registros do módulo", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("${records.size} registro(s) disponíveis", color = Muted, style = MaterialTheme.typography.bodySmall)
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(records.take(100), key = { it.title + it.subtitle }) { record ->
                    Surface(Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.small, color = PanelSurface) {
                        Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(record.title, style = MaterialTheme.typography.titleMedium)
                            if (record.subtitle.isNotBlank()) Text(record.subtitle, color = Muted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminDetailsDialog(admin: AdminOverview?, onDismiss: () -> Unit, onManage: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Resumo administrativo") }, text = { Column(verticalArrangement = Arrangement.spacedBy(7.dp)) { Text("Usuários: ${admin?.users?.size ?: 0}"); Text("Auditoria: ${admin?.audit?.size ?: 0}"); Text("Snapshots: ${admin?.snapshots?.size ?: 0}"); Text("Fontes: ${admin?.sources?.size ?: 0}"); Text("Importações: ${admin?.imports?.size ?: 0}") } }, confirmButton = { Column { Button(onClick = onManage) { Text("Gerenciar usuários") }; TextButton(onClick = onDismiss) { Text("Fechar") } } })
}
