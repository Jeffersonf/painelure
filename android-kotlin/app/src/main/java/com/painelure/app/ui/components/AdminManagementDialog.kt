package com.painelure.app.ui.components

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Surface
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import com.painelure.app.data.PainelRepository
import com.painelure.app.ui.theme.AccentLime
import com.painelure.app.ui.theme.BackgroundDark
import com.painelure.app.ui.theme.Muted
import com.painelure.app.ui.theme.PanelBorder
import com.painelure.app.ui.theme.PanelGlass
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Composable
private fun AdminActionButton(label: String, enabled: Boolean = true, destructive: Boolean = false, onClick: () -> Unit) {
    FilledTonalButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp),
        border = BorderStroke(1.dp, if (destructive) MaterialTheme.colorScheme.error.copy(alpha = .24f) else PanelBorder),
        colors = if (destructive) ButtonDefaults.filledTonalButtonColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            contentColor = MaterialTheme.colorScheme.onErrorContainer
        ) else ButtonDefaults.filledTonalButtonColors(containerColor = PanelGlass.copy(alpha = .64f), contentColor = MaterialTheme.colorScheme.onSurface)
    ) { Text(label) }
}

@Composable
private fun AdminField(value: String, onValueChange: (String) -> Unit, label: String, minLines: Int = 1) {
    OutlinedTextField(value, onValueChange, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = minLines == 1, minLines = minLines, shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = AccentLime, focusedLabelColor = AccentLime, cursorColor = AccentLime, unfocusedBorderColor = PanelBorder, unfocusedContainerColor = PanelGlass.copy(alpha = .46f), focusedContainerColor = PanelGlass.copy(alpha = .68f)))
}

@Composable
private fun AdminSectionTitle(title: String, subtitle: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.padding(top = 7.dp)) {
        Text(title, color = AccentLime, style = MaterialTheme.typography.titleMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
        if (subtitle != null) Text(subtitle, color = Muted, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun AdminHistoryRow(kind: String, title: String, detail: String) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp),
        color = PanelGlass.copy(alpha = .48f),
        border = BorderStroke(1.dp, PanelBorder)
    ) {
        Row(Modifier.padding(horizontal = 11.dp, vertical = 9.dp), verticalAlignment = Alignment.Top) {
            androidx.compose.foundation.layout.Box(Modifier.padding(top = 4.dp).size(7.dp).background(AccentLime, RoundedCornerShape(50.dp)))
            Spacer(Modifier.width(9.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(kind, color = AccentLime, style = MaterialTheme.typography.labelSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                Text(title, style = MaterialTheme.typography.bodyMedium, maxLines = 2)
                if (detail.isNotBlank()) Text(detail, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2)
            }
        }
    }
}

@androidx.compose.material3.ExperimentalMaterial3Api
@Composable
fun AdminManagementDialog(repository: PainelRepository, token: String, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Consulta") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var contactId by remember { mutableStateOf("") }
    var importType by remember { mutableStateOf("inventory") }
    var internalJson by remember { mutableStateOf("{}") }
    var sourcesJson by remember { mutableStateOf("{}") }
    var accessRulesJson by remember { mutableStateOf("{}") }
    var pageMaintenanceJson by remember { mutableStateOf("{}") }
    var selectedId by remember { mutableStateOf("") }
    var userSearch by remember { mutableStateOf("") }
    var users by remember { mutableStateOf(emptyList<com.painelure.app.data.AdminRecord>()) }
    var onlineOverview by remember { mutableStateOf<com.painelure.app.data.AdminOverview?>(null) }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        busy = true
        scope.launch {
            val csv = withContext(Dispatchers.IO) { context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }.orEmpty() }
            val result = withContext(Dispatchers.IO) { repository.importCsv(token, importType, csv) }
            busy = false
            message = result.fold({ "CSV importado." }, { it.message ?: "Não foi possível importar." })
        }
    }
    val backupImportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        busy = true
        scope.launch {
            val text = withContext(Dispatchers.IO) { context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }.orEmpty() }
            val result = runCatching { JSONObject(text) }.fold({ repository.importBackup(it) }, { Result.failure(it) })
            busy = false
            message = result.fold({ "Backup JSON importado. Feche e reabra os módulos para visualizar." }, { it.message ?: "Backup JSON inválido." })
        }
    }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(repository.cachedDataJson()) }
        message = if (uri == null) "Exportação cancelada." else "Backup exportado."
    }
    LaunchedEffect(token) {
        withContext(Dispatchers.IO) { repository.currentUser(token) }.getOrNull()?.let { user ->
        name = user.name
        role = user.role
        contactId = user.contactId
        }
        onlineOverview = withContext(Dispatchers.IO) { repository.adminOverview(token) }.getOrNull()
        users = onlineOverview?.users.orEmpty()
        withContext(Dispatchers.IO) { runCatching { JSONObject(repository.cachedDataJson()) }.getOrNull() }?.let { root ->
            internalJson = root.optJSONObject("internal")?.toString() ?: "{}"
            sourcesJson = root.optJSONObject("sources")?.toString() ?: "{}"
            accessRulesJson = root.optJSONObject("accessRules")?.toString() ?: "{}"
            pageMaintenanceJson = root.optJSONObject("pageMaintenance")?.toString() ?: "{}"
        }
    }
    fun saveProfile() {
        if (name.isBlank()) { message = "Informe seu nome."; return }
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.updateMyProfile(token, JSONObject().put("name", name).put("role", role)) }
            busy = false
            message = result.fold({ "Perfil atualizado." }, { it.message ?: "Não foi possível atualizar." })
        }
    }
    fun createUser() {
        if (username.isBlank() || password.isBlank()) { message = "Informe usuário e senha."; return }
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.createUser(token, JSONObject().put("username", username).put("name", name.ifBlank { username }).put("role", role).put("password", password).put("contactId", contactId)) }
            busy = false
            message = result.fold({ "Usuário criado." }, { it.message ?: "Não foi possível criar." })
        }
    }
    fun updateSelected() {
        if (selectedId.isBlank() || name.isBlank()) { message = "Selecione um usuário e informe o nome."; return }
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.updateUser(token, selectedId, JSONObject().put("name", name).put("role", role).put("contactId", contactId).apply { if (password.isNotBlank()) put("password", password) }) }
            busy = false
            message = result.fold({ "Usuário atualizado." }, { it.message ?: "Não foi possível atualizar." })
            if (result.isSuccess) users = withContext(Dispatchers.IO) { repository.adminOverview(token) }.getOrNull()?.users.orEmpty()
        }
    }
    fun deleteSelected() {
        if (selectedId.isBlank()) { message = "Selecione um usuário."; return }
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.deleteUser(token, selectedId) }
            busy = false
            message = result.fold({ "Usuário removido." }, { it.message ?: "Não foi possível remover." })
            if (result.isSuccess) { selectedId = ""; users = withContext(Dispatchers.IO) { repository.adminOverview(token) }.getOrNull()?.users.orEmpty() }
        }
    }
    fun resetSelectedPin() {
        if (selectedId.isBlank()) { message = "Selecione um usuário."; return }
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                repository.updateUser(token, selectedId, JSONObject()
                    .put("password", "1234")
                    .put("preferences", JSONObject().put("forcePinChange", true)))
            }
            busy = false
            message = result.fold({ "PIN resetado para 1234; a troca será obrigatória." }, { it.message ?: "Não foi possível resetar o PIN." })
        }
    }
    fun saveInternal() {
        busy = true
        scope.launch {
            val result = runCatching { JSONObject(internalJson) }.fold(
                { withContext(Dispatchers.IO) { repository.saveInternal(token, it) } },
                { Result.failure(it) }
            )
            busy = false
            message = result.fold({ "Dados internos salvos." }, { it.message ?: "JSON interno inválido." })
        }
    }
    fun saveSources() {
        busy = true
        scope.launch {
            val result = runCatching { JSONObject(sourcesJson) }.fold(
                { withContext(Dispatchers.IO) { repository.saveSources(token, it) } },
                { Result.failure(it) }
            )
            busy = false
            message = result.fold({ "Fontes salvas." }, { it.message ?: "JSON de fontes inválido." })
        }
    }
    fun saveAdminConfig() {
        busy = true
        scope.launch {
            val result = runCatching { JSONObject(accessRulesJson) to JSONObject(pageMaintenanceJson) }.fold(
                { (access, maintenance) -> withContext(Dispatchers.IO) { repository.saveAdminConfig(token, access, maintenance) } },
                { Result.failure(it) }
            )
            busy = false
            message = result.fold({ "Regras e manutenção salvas." }, { it.message ?: "JSON administrativo inválido." })
        }
    }
    fun pullOnlineData() {
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.load(token) }
            busy = false
            message = result.fold({ "Estado online carregado: ${it.schools.size} escola(s)." }, { it.message ?: "Não foi possível carregar o estado online." })
        }
    }
    fun refreshOfficialSources() {
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.refreshOfficialSources(token) }
            val loaded = result.getOrNull()?.optJSONArray("results")
                ?.let { array -> (0 until array.length()).count { array.optJSONObject(it)?.optString("status") == "loaded" } }
                ?: 0
            if (result.isSuccess) withContext(Dispatchers.IO) { repository.load(token) }
            busy = false
            message = result.fold({ "Fontes oficiais atualizadas: $loaded fonte(s)." }, { it.message ?: "Não foi possível atualizar as fontes oficiais." })
        }
    }
    fun checkApi() {
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.health() }
            busy = false
            message = result.fold(
                { health -> "API online: ${health.optString("status", "ok")} · armazenamento ${health.optJSONObject("storage")?.optString("mode", "API") ?: "API"}." },
                { it.message ?: "API indisponível." }
            )
        }
    }
    fun publishLocalData() {
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { repository.publishCachedData(token) }
            busy = false
            message = result.fold({ "Estado local publicado no servidor." }, { it.message ?: "Não foi possível publicar o estado local." })
        }
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            androidx.compose.foundation.layout.Box(Modifier.align(Alignment.CenterHorizontally).width(38.dp).height(4.dp).background(MaterialTheme.colorScheme.onSurface.copy(alpha = .18f), RoundedCornerShape(50.dp)))
            Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("PAINELURE  /  CONTROLE", color = AccentLime, style = MaterialTheme.typography.labelSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    Text("Administração", style = MaterialTheme.typography.headlineSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    Text("Usuários, fontes e publicação", style = MaterialTheme.typography.bodySmall, color = Muted)
                }
                Surface(shape = RoundedCornerShape(13.dp), color = AccentLime.copy(alpha = .14f)) { androidx.compose.material3.Icon(Icons.Default.AdminPanelSettings, "Administração", tint = AccentLime, modifier = Modifier.padding(10.dp).size(21.dp)) }
                TextButton(onClick = onDismiss) { Text("Fechar") }
            }
            LazyColumn(Modifier.heightIn(max = 620.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            AdminSectionTitle("Meu perfil", "Identidade e nível de acesso do administrador")
            AdminField(name, { name = it }, "Nome")
            AdminField(role, { role = it }, "Perfil")
            Spacer(Modifier.height(10.dp))
            AdminSectionTitle("Usuários", "Selecione um cadastro para editar, resetar ou remover")
            AdminField(userSearch, { userSearch = it }, "Buscar usuário")
            users.filter { user -> userSearch.isBlank() || listOf(user.title, user.detail, user.contactId).any { value -> value.contains(userSearch, true) } }.take(50).forEach { user ->
                Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp), color = if (selectedId == user.id) AccentLime.copy(alpha = .12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .34f)) {
                    TextButton(onClick = { selectedId = user.id; name = user.title; role = user.detail; contactId = user.contactId }, modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 5.dp)) { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f), horizontalAlignment = Alignment.Start) { Text(user.title, style = MaterialTheme.typography.titleSmall); Text(user.detail, color = Muted, style = MaterialTheme.typography.bodySmall) }; if (selectedId == user.id) Text("Selecionado", color = AccentLime, style = MaterialTheme.typography.labelSmall) } }
                }
            }
            onlineOverview?.let { overview ->
                AdminSectionTitle("Histórico online", "Snapshots, auditoria, importações e fontes")
                Text("Snapshots: ${overview.snapshots.size} · Auditoria: ${overview.audit.size} · Importações: ${overview.imports.size}", color = Muted, style = MaterialTheme.typography.bodySmall)
                overview.audit.take(5).forEach { row -> AdminHistoryRow("AUDITORIA", row.title, row.detail) }
                overview.snapshots.take(5).forEach { row -> AdminHistoryRow("SNAPSHOT", row.title, row.createdAt) }
                overview.imports.take(5).forEach { row -> AdminHistoryRow("IMPORTAÇÃO", row.title, row.detail) }
                overview.sources.take(5).forEach { row -> AdminHistoryRow("FONTE", row.title, row.detail) }
            }
            AdminSectionTitle("Novo usuário", "Credenciais e vínculo do cadastro")
            AdminField(username, { username = it }, "Usuário")
            AdminField(password, { password = it }, "Senha")
            AdminField(contactId, { contactId = it }, "ID do contato vinculado")
            AdminField(importType, { importType = it }, "Tipo CSV: inventory, schools, network...")
            AdminSectionTitle("Configuração", "Dados editáveis sincronizados com a API")
            AdminField(internalJson, { internalJson = it }, "Dados internos JSON", 2)
            AdminField(sourcesJson, { sourcesJson = it }, "Fontes oficiais JSON", 2)
            AdminField(accessRulesJson, { accessRulesJson = it }, "Regras de acesso JSON", 2)
            AdminField(pageMaintenanceJson, { pageMaintenanceJson = it }, "Manutenção de páginas JSON", 2)
            AdminActionButton("Salvar acesso/manutenção", !busy, onClick = ::saveAdminConfig)
            AdminActionButton("Limpar cache local", !busy, onClick = { onlineOverview = null; repository.clearCache(); message = "Cache local limpo." })
            AdminActionButton("Atualizar fontes oficiais", !busy, onClick = ::refreshOfficialSources)
            AdminSectionTitle("Ações administrativas", "Operações online e manutenção do painel")
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                AdminActionButton("Verificar API", !busy, onClick = ::checkApi)
                AdminActionButton("Carregar estado online", !busy, onClick = ::pullOnlineData)
                AdminActionButton("Publicar estado local", !busy, onClick = ::publishLocalData)
            }
            AdminSectionTitle("Gestão de usuários", "Salvar perfil, criar e administrar acessos")
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                AdminActionButton("Salvar perfil", !busy, onClick = ::saveProfile)
                AdminActionButton("Criar usuário", !busy, onClick = ::createUser)
                AdminActionButton("Editar selecionado", !busy && selectedId.isNotBlank(), onClick = ::updateSelected)
                AdminActionButton("Resetar PIN para 1234", !busy && selectedId.isNotBlank(), onClick = ::resetSelectedPin)
                AdminActionButton("Excluir selecionado", !busy && selectedId.isNotBlank(), destructive = true, onClick = ::deleteSelected)
            }
            AdminSectionTitle("Dados e arquivos", "Importação, exportação e fontes oficiais")
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                AdminActionButton("Salvar dados internos", !busy, onClick = ::saveInternal)
                AdminActionButton("Salvar fontes", !busy, onClick = ::saveSources)
                AdminActionButton("Selecionar CSV e importar", !busy, onClick = { importLauncher.launch(arrayOf("text/*", "text/csv", "application/csv")) })
                AdminActionButton("Importar backup JSON", !busy, onClick = { backupImportLauncher.launch(arrayOf("application/json", "text/*")) })
                AdminActionButton("Exportar backup JSON", !busy, onClick = { exportLauncher.launch("painelure-backup.json") })
            }
            if (message.isNotBlank()) Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = AccentLime.copy(alpha = .10f)) { Text(message, color = AccentLime, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(11.dp)) }
        } } }
        }
    }
}
