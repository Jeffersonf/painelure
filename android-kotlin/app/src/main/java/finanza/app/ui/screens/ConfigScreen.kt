package com.painelure.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.components.SettingsGroup
import com.painelure.app.ui.components.SettingsRow
import com.painelure.app.ui.components.SettingsSectionTitle
import com.painelure.app.ui.components.ProfilePill

data class ConfigUiState(
    val userName: String,
    val accountStatus: String,
    val budget: String,
    val theme: String,
    val accounts: Int,
    val currency: String,
    val notifications: Boolean,
    val privacy: Boolean,
    val lastSync: String,
    val pendingSync: Int,
    val syncError: String,
    val role: String,
    val twoFactor: Boolean
)

data class ConfigActions(
    val editProfile: () -> Unit,
    val openAccount: () -> Unit,
    val editBudget: () -> Unit,
    val changeTheme: () -> Unit,
    val toggleNotifications: (Boolean) -> Unit,
    val togglePrivacy: (Boolean) -> Unit,
    val sync: () -> Unit,
    val backup: () -> Unit,
    val diagnostics: () -> Unit,
    val security: () -> Unit,
    val admin: () -> Unit,
    val pinShortcut: () -> Unit,
    val clearData: () -> Unit
)

@Composable
fun ConfigScreen(state: ConfigUiState, actions: ConfigActions) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 92.dp)) {
        ProfilePill(state.userName, actions.editProfile, Modifier.padding(start = 12.dp, top = 10.dp))
        Text("Configurações", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(start = 12.dp, top = 10.dp))
        Text("App e preferências", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.58f), modifier = Modifier.padding(start = 12.dp, top = 2.dp, bottom = 2.dp))

        SettingsSectionTitle("Conta")
        SettingsGroup {
            SettingsRow("Seu perfil", state.userName, actions.editProfile)
            SettingsRow("Conta Finanza", state.accountStatus, actions.openAccount, showDivider = false)
        }
        SettingsSectionTitle("Planejamento")
        SettingsGroup {
            SettingsRow("Orçamento mensal", state.budget, actions.editBudget)
            SettingsRow("Contas", "${state.accounts} ativas", showDivider = false)
        }
        SettingsSectionTitle("Aparência")
        SettingsGroup {
            SettingsRow("Tema", state.theme, actions.changeTheme)
            SettingsRow("Ocultar valores", switch = state.privacy, onSwitchChange = actions.togglePrivacy, showDivider = false)
        }
        SettingsSectionTitle("Captura rápida")
        SettingsGroup {
            SettingsRow("Notificação", switch = state.notifications, onSwitchChange = actions.toggleNotifications)
            SettingsRow("Fixar atalho", onClick = actions.pinShortcut, showDivider = false)
        }
        SettingsSectionTitle("Dados")
        SettingsGroup {
            SettingsRow("Sincronizar agora", state.lastSync, actions.sync)
            if (state.pendingSync > 0) SettingsRow("Pendências locais", state.pendingSync.toString(), actions.sync)
            if (state.syncError.isNotBlank()) SettingsRow("Último erro", state.syncError)
            SettingsRow("Compartilhar backup", onClick = actions.backup)
            SettingsRow("Diagnóstico", onClick = actions.diagnostics)
            SettingsRow("Apagar dados locais", onClick = actions.clearData, showDivider = false)
        }
        SettingsSectionTitle("Segurança")
        SettingsGroup {
            SettingsRow("Autenticação em duas etapas", if (state.twoFactor) "Ativa" else "Desativada", actions.security)
            if (state.role == "admin") {
                SettingsRow("Administração", state.role, actions.admin, showDivider = false)
            } else {
                SettingsRow("Perfil de acesso", state.role.ifBlank { "local" }, showDivider = false)
            }
        }
        Spacer(Modifier.height(18.dp))
        Text("Finanza Android 1.0.0", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.45f), style = MaterialTheme.typography.bodySmall, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}

