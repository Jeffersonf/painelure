@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.painelure.app

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.Image
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.ui.unit.dp
import com.painelure.app.data.*
import com.painelure.app.ui.components.AdminManagementDialog
import com.painelure.app.ui.components.JustificationDialog
import com.painelure.app.ui.components.MobileOperationSheet
import com.painelure.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.YearMonth
import java.nio.charset.Charset

private const val API_BASE = "https://painelure2-api.onrender.com"

private fun repairText(value: String): String {
    var current = value
    repeat(2) {
        if (!current.any { it == '\u00C3' || it == '\u00C2' || it == '\u00E2' || it == '\u00EF' || it == '\uFFFD' }) return current
        val decoded = runCatching {
            current.toByteArray(Charset.forName("windows-1252")).toString(Charsets.UTF_8)
        }.getOrDefault(current)
        if (decoded == current) return current
        current = decoded
    }
    return current
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { PainelNativeApp(this) }
    }
}

private enum class NativeRoute { HOME, MODULES, ACCOUNT }

@Composable
private fun PainelNativeApp(context: Context) {
    val repository = remember { PainelRepository(context, API_BASE) }
    var token by remember { mutableStateOf(context.getSharedPreferences("painelure", 0).getString("token", "").orEmpty()) }
    var forcePinChange by remember { mutableStateOf(false) }
    val preferences = remember { context.getSharedPreferences("painelure", 0) }
    var dark by remember { mutableStateOf(preferences.getBoolean("dark", true)) }
    LaunchedEffect(token) {
        if (token.isNotBlank()) {
            val sessionUser = withContext(Dispatchers.IO) { repository.currentUser(token) }
            if (sessionUser.isSuccess) {
                forcePinChange = sessionUser.getOrNull()?.forcePinChange == true
            } else {
                context.getSharedPreferences("painelure", 0).edit().remove("token").apply()
                token = ""
                forcePinChange = false
            }
        } else {
            forcePinChange = false
        }
    }
    PainelTheme(dark) {
        if (token.isBlank()) {
            NativeLoginV2(repository) { session ->
                context.getSharedPreferences("painelure", 0).edit().putString("token", session.token).apply()
                token = session.token
                forcePinChange = session.user.forcePinChange
            }
        } else if (forcePinChange) {
            NativeMandatoryPinChange(repository, token) { forcePinChange = false }
        } else {
            NativeShell(repository, token, {
                repository.logout(token)
                context.getSharedPreferences("painelure", 0).edit().remove("token").apply()
                token = ""
            }, {
                dark = !dark
                preferences.edit().putBoolean("dark", dark).apply()
            })
        }
    }
}

@Composable
private fun NativeLogin(repository: PainelRepository, onSuccess: (Session) -> Unit) {
    var username by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Box(Modifier.fillMaxSize().statusBarsPadding().background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.surface))).padding(24.dp), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.fillMaxWidth().widthIn(max = 440.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .18f))
        ) {
            Column(Modifier.padding(28.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = RoundedCornerShape(16.dp), color = Lime.copy(alpha = .14f)) {
                        Image(painterResource(com.painelure.app.R.drawable.brand_mark), contentDescription = "PainelURE", modifier = Modifier.padding(8.dp).size(42.dp))
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelLarge)
                        Text("ACESSO SEGURO", color = Muted, style = MaterialTheme.typography.labelSmall)
                    }
                }
                Text("Entrar no painel", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Acesse os módulos operacionais da URE em um só lugar.", color = Muted, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(username, { username = it }, Modifier.fillMaxWidth(), label = { Text("Nome de usuário") }, singleLine = true, shape = RoundedCornerShape(16.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLeadingIconColor = Lime, cursorColor = Lime), leadingIcon = { Icon(Icons.Default.Person, null) })
                OutlinedTextField(pin, { pin = it }, Modifier.fillMaxWidth(), label = { Text("PIN / senha") }, singleLine = true, shape = RoundedCornerShape(16.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLeadingIconColor = Lime, cursorColor = Lime), visualTransformation = PasswordVisualTransformation(), leadingIcon = { Icon(Icons.Default.Lock, null) })
                if (error.isNotBlank()) LoginErrorCard(error)
                Spacer(Modifier.height(4.dp))
                Button(enabled = !busy && username.isNotBlank() && pin.isNotBlank(), onClick = {
                    busy = true
                    scope.launch {
                        val result = withContext(Dispatchers.IO) { repository.login(username.trim(), pin) }
                        busy = false
                        result.fold({ onSuccess(it) }, { error = it.message ?: "Não foi possível entrar." })
                    }
                }, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(15.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = BackgroundDark, disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant, disabledContentColor = Muted)) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Entrar")
                }
                TextButton(onClick = {
                    val target = username.trim().takeIf(String::isNotBlank)?.let { " de $it" }.orEmpty()
                    error = "Solicite ao administrador o reset do PIN$target. O novo acesso será 1234 e pedirá troca no próximo login."
                }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Esqueci meu PIN") }
            }
        }
    }
}

@Composable
private fun NativeLoginV2(repository: PainelRepository, onSuccess: (Session) -> Unit) {
    var username by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val dark = MaterialTheme.colorScheme.background == BackgroundDark
    Column(
        Modifier.fillMaxSize().statusBarsPadding().imePadding().background(
            Brush.radialGradient(
                listOf(AccentLime.copy(alpha = if (dark) .14f else .09f), MaterialTheme.colorScheme.background),
                radius = 900f
            )
        ).padding(22.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Card(
            Modifier.fillMaxWidth().widthIn(max = 430.dp),
            shape = RoundedCornerShape(30.dp),
            colors = CardDefaults.cardColors(containerColor = PanelGlass),
            border = BorderStroke(1.dp, PanelBorder)
        ) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(17.dp), color = Lime.copy(alpha = .15f)) {
                        Image(painterResource(com.painelure.app.R.drawable.brand_mark), contentDescription = "PainelURE", modifier = Modifier.padding(9.dp).size(44.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                        Text("CENTRAL OPERACIONAL", color = Muted, style = MaterialTheme.typography.labelSmall)
                    }
                    Surface(shape = RoundedCornerShape(50.dp), color = SuccessGreen.copy(alpha = .12f)) {
                        Icon(Icons.Default.Shield, "Acesso protegido", tint = SuccessGreen, modifier = Modifier.padding(8.dp).size(18.dp))
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 6.dp)) {
                    Text("Bem-vindo de volta", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("Entre para acompanhar escolas, chamados e operações da URE.", color = Muted, style = MaterialTheme.typography.bodyMedium)
                }
                OutlinedTextField(
                    username, { username = it; error = "" }, Modifier.fillMaxWidth(), label = { Text("Usuário") }, singleLine = true,
                    shape = RoundedCornerShape(16.dp), leadingIcon = { Icon(Icons.Default.PersonOutline, null) },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, focusedLeadingIconColor = Lime, cursorColor = Lime)
                )
                OutlinedTextField(
                    pin, { pin = it; error = "" }, Modifier.fillMaxWidth(), label = { Text("PIN / senha") }, singleLine = true,
                    shape = RoundedCornerShape(16.dp), leadingIcon = { Icon(Icons.Default.Lock, null) }, visualTransformation = PasswordVisualTransformation(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, focusedLeadingIconColor = Lime, cursorColor = Lime)
                )
                if (error.isNotBlank()) LoginErrorCard(error)
                Button(
                    enabled = !busy && username.isNotBlank() && pin.isNotBlank(),
                    onClick = {
                        busy = true
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { repository.login(username.trim(), pin) }
                            busy = false
                            result.fold({ onSuccess(it) }, { error = it.message ?: "Não foi possível entrar." })
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = BackgroundDark, disabledContainerColor = PanelSubtle, disabledContentColor = Muted)
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = BackgroundDark)
                    else { Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Entrar no painel") }
                }
                TextButton(onClick = {
                    val target = username.trim().takeIf(String::isNotBlank)?.let { " de $it" }.orEmpty()
                    error = "Solicite ao administrador o reset do PIN$target. O novo acesso será 1234 e pedirá troca no próximo login."
                }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Esqueci meu PIN") }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Lock, null, tint = Muted, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(5.dp))
                    Text("Conexão protegida · acesso por perfil", color = Muted, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun LoginErrorCard(message: String) {
    Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.errorContainer.copy(alpha = .58f)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun NativeMandatoryPinChange(repository: PainelRepository, token: String, onComplete: () -> Unit) {
    var pin by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Box(Modifier.fillMaxSize().statusBarsPadding().imePadding().background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.surface))), contentAlignment = Alignment.Center) {
      Card(Modifier.fillMaxWidth().padding(24.dp).widthIn(max = 440.dp), shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), border = BorderStroke(1.dp, Lime.copy(alpha = .18f))) {
       Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(shape = RoundedCornerShape(13.dp), color = Lime.copy(alpha = .14f)) { Icon(Icons.Default.LockReset, "Troca de PIN", tint = Lime, modifier = Modifier.padding(10.dp).size(22.dp)) }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) { Text("SEGURANÇA", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold); Text("Atualização obrigatória", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        }
        Text("Seu acesso foi redefinido. Escolha um PIN novo para continuar.", color = Muted)
        Spacer(Modifier.height(22.dp))
        OutlinedTextField(pin, { pin = it }, Modifier.fillMaxWidth(), label = { Text("Novo PIN") }, singleLine = true, shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, cursorColor = Lime), visualTransformation = PasswordVisualTransformation())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(confirm, { confirm = it }, Modifier.fillMaxWidth(), label = { Text("Confirmar PIN") }, singleLine = true, shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, cursorColor = Lime), visualTransformation = PasswordVisualTransformation())
        if (error.isNotBlank()) LoginErrorCard(error)
        Spacer(Modifier.height(18.dp))
        Button(enabled = !busy, onClick = {
            when {
                pin.length < 4 -> error = "Use pelo menos 4 caracteres."
                pin == "1234" -> error = "Escolha um PIN diferente do inicial."
                pin != confirm -> error = "Os PINs não conferem."
                else -> {
                    busy = true
                    scope.launch {
                        val payload = JSONObject().put("password", pin).put("preferences", JSONObject().put("forcePinChange", false))
                        val result = withContext(Dispatchers.IO) { repository.updateMyProfile(token, payload) }
                        busy = false
                        result.fold({ onComplete() }, { error = it.message ?: "Não foi possível atualizar o PIN." })
                    }
                }
            }
        }, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = BackgroundDark, disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant, disabledContentColor = Muted)) { if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = BackgroundDark) else Text("Salvar novo PIN") }
       }
      }
    }
}

@Composable
private fun NativeShell(repository: PainelRepository, token: String, onLogout: () -> Unit, onTheme: () -> Unit) {
    var route by remember { mutableStateOf(NativeRoute.HOME) }
    var role by remember { mutableStateOf("Consulta") }
    var userName by remember { mutableStateOf("") }
    var userAvatar by remember { mutableStateOf("") }
    var data by remember { mutableStateOf(PainelData()) }
    var loading by remember { mutableStateOf(true) }
    var offline by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf("") }
    var reload by remember { mutableIntStateOf(0) }
    var operationOpen by remember { mutableStateOf(false) }
    var justificationOpen by remember { mutableStateOf(false) }
    var justificationSupervisor by remember { mutableStateOf("") }
    var adminOpen by remember { mutableStateOf(false) }
    var selectedModule by remember { mutableStateOf<PanelModule?>(null) }
    LaunchedEffect(token) { withContext(Dispatchers.IO) { repository.currentUser(token) }.getOrNull()?.let { user -> role = user.role.ifBlank { "Consulta" }; userName = user.name; userAvatar = user.avatar } }
    LaunchedEffect(token, reload) {
        loading = true
        loadError = ""
        val result = withContext(Dispatchers.IO) { repository.load(token) }
        result.onSuccess { data = it; offline = it.fromCache }
            .onFailure { error -> offline = true; loadError = error.message.orEmpty() }
        loading = false
    }
    Scaffold(contentWindowInsets = WindowInsets(0, 0, 0, 0), containerColor = MaterialTheme.colorScheme.background, bottomBar = { NativeBottomBarV2(route) { route = it; selectedModule = null } }, floatingActionButton = {
        if (route != NativeRoute.ACCOUNT && selectedModule == null) {
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (PermissionPolicy.can(role, "supervision", data.roleAccess)) SmallFloatingActionButton(onClick = {
                    justificationSupervisor = data.supervisors.firstOrNull { supervisor -> listOf(supervisor.title, supervisor.subtitle).any { it.contains(userName, true) } }?.title ?: data.supervisors.firstOrNull()?.title.orEmpty()
                    justificationOpen = justificationSupervisor.isNotBlank()
                }, containerColor = PanelGlass, contentColor = Lime, shape = RoundedCornerShape(15.dp)) {
                    Icon(Icons.Default.EditNote, "Abrir justificativa", modifier = Modifier.size(20.dp))
                }
                SmallFloatingActionButton(
                    onClick = { operationOpen = true },
                    containerColor = Lime,
                    contentColor = BackgroundDark,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.size(58.dp)
                ) {
                    Icon(Icons.Default.Add, "Nova operação", modifier = Modifier.size(26.dp))
                }
            }
        }
    }) { padding ->
        Box(Modifier.fillMaxSize().statusBarsPadding().background(MaterialTheme.colorScheme.background)) {
            Box(
                Modifier.fillMaxSize()
                    .background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.surface)))
                    .background(Brush.radialGradient(listOf(AccentLime.copy(alpha = .055f), Color.Transparent), radius = 820f))
            )
            Box(Modifier.fillMaxSize().padding(padding)) {
                when {
                    selectedModule != null -> NativeModuleScreen(selectedModule!!, role, userName, data, repository, token, { reload++ }, { selectedModule = null })
                    route == NativeRoute.HOME -> NativeHome(data, role, userName, loading, offline, loadError, { reload++ }) { selectedModule = it }
                    route == NativeRoute.MODULES -> NativeModuleHubV2(role, data) { selectedModule = it }
                    else -> NativeAccountWithProfileV2(userName, userAvatar, role, repository, token, onTheme, onLogout, PermissionPolicy.can(role, "admin", data.roleAccess), { adminOpen = true })
                }
            }
        }
    }
    if (operationOpen) MobileOperationSheet(repository, token, data.roleAccess) { operationOpen = false }
    if (justificationOpen) JustificationDialog(repository, token, justificationSupervisor) { justificationOpen = false }
    if (adminOpen) AdminManagementDialog(repository, token) { adminOpen = false }
}

@Composable
private fun NativeBottomBarV2(route: NativeRoute, onRoute: (NativeRoute) -> Unit) {
    Surface(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 7.dp).navigationBarsPadding().height(68.dp), shape = RoundedCornerShape(25.dp), color = PanelGlass.copy(alpha = .97f), shadowElevation = 18.dp, tonalElevation = 0.dp, border = BorderStroke(1.dp, PanelBorder)) {
        Row(Modifier.fillMaxSize().padding(horizontal = 8.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            PainelNavItem(route == NativeRoute.HOME, Icons.Default.Home, "Painel", Modifier.weight(1f)) { onRoute(NativeRoute.HOME) }
            PainelNavItem(route == NativeRoute.MODULES, Icons.Default.Apps, "Módulos", Modifier.weight(1f)) { onRoute(NativeRoute.MODULES) }
            PainelNavItem(route == NativeRoute.ACCOUNT, Icons.Default.Person, "Conta", Modifier.weight(1f)) { onRoute(NativeRoute.ACCOUNT) }
        }
    }
}

@Composable
private fun PainelNavItem(selected: Boolean, icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val contentColor = if (selected) MaterialTheme.colorScheme.primary else Muted
    Box(modifier.fillMaxSize().clip(RoundedCornerShape(17.dp)).background(if (selected) contentColor.copy(alpha = .11f) else Color.Transparent).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, label, tint = contentColor, modifier = Modifier.size(if (selected) 22.dp else 20.dp))
            Text(repairText(label), color = contentColor, style = MaterialTheme.typography.labelSmall, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, maxLines = 1)
            Box(Modifier.padding(top = 2.dp).size(4.dp).clip(RoundedCornerShape(50)).background(if (selected) contentColor else Color.Transparent))
        }
    }
}

@Composable
private fun NativeBottomBar(route: NativeRoute, onRoute: (NativeRoute) -> Unit) {
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 8.dp) {
        val navColors = NavigationBarItemDefaults.colors(selectedIconColor = BackgroundDark, selectedTextColor = Lime, indicatorColor = Lime.copy(alpha = .86f), unselectedIconColor = Muted, unselectedTextColor = Muted)
        NavigationBarItem(route == NativeRoute.HOME, { onRoute(NativeRoute.HOME) }, icon = { Icon(Icons.Default.Home, null) }, label = { Text("Painel") }, colors = navColors)
        NavigationBarItem(route == NativeRoute.MODULES, { onRoute(NativeRoute.MODULES) }, icon = { Icon(Icons.Default.Apps, null) }, label = { Text("Módulos") }, colors = navColors)
        NavigationBarItem(route == NativeRoute.ACCOUNT, { onRoute(NativeRoute.ACCOUNT) }, icon = { Icon(Icons.Default.Person, null) }, label = { Text("Conta") }, colors = navColors)
    }
}

@Composable
private fun ModuleBackHeaderLegacy(back: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(13.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .58f)) {
            IconButton(onClick = back) { Icon(Icons.Default.ArrowBack, "Voltar", tint = Lime) }
        }
        Spacer(Modifier.width(12.dp))
        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelLarge)
            Text("Área operacional", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ModuleBackHeader(back: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        FilledTonalIconButton(onClick = back, shape = RoundedCornerShape(13.dp)) {
            Icon(Icons.Default.ArrowBack, "Voltar", tint = Lime)
        }
        Spacer(Modifier.width(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.width(4.dp).height(18.dp).clip(RoundedCornerShape(50)).background(Lime))
            Text("ÁREA OPERACIONAL", color = Muted, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PainelSearchField(value: String, onValueChange: (String) -> Unit, label: String, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(repairText(label)) },
        singleLine = true,
        leadingIcon = { Icon(Icons.Default.Search, null) },
        trailingIcon = { if (value.isNotBlank()) IconButton(onClick = { onValueChange("") }) { Icon(Icons.Default.Close, "Limpar busca", tint = Muted) } },
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedContainerColor = PanelGlass.copy(alpha = .55f),
            focusedContainerColor = PanelGlass.copy(alpha = .72f),
            focusedBorderColor = Lime,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = .32f),
            focusedLeadingIconColor = Lime,
            cursorColor = Lime
        )
    )
}

@Composable
private fun PainelFormField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    minLines: Int = 1
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(repairText(label)) },
        singleLine = minLines == 1,
        minLines = minLines,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Lime,
            focusedLabelColor = Lime,
            focusedLeadingIconColor = Lime,
            cursorColor = Lime,
            unfocusedBorderColor = PanelBorder,
            unfocusedContainerColor = PanelGlass.copy(alpha = .46f),
            focusedContainerColor = PanelGlass.copy(alpha = .68f)
        )
    )
}

@Composable
private fun PainelStatusBadge(status: String) {
    val normalized = status.lowercase()
    val color = when {
        normalized.contains("erro") || normalized.contains("def") || normalized.contains("atras") || normalized.contains("crit") -> DangerRed
        normalized.contains("pend") || normalized.contains("aten") || normalized.contains("manut") -> WarningOrange
        normalized.contains("ok") || normalized.contains("resolv") || normalized.contains("concl") || normalized.contains("ativo") -> SuccessGreen
        else -> AccentBlue
    }
    Surface(shape = RoundedCornerShape(50.dp), color = color.copy(alpha = .13f)) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Box(Modifier.size(5.dp).clip(RoundedCornerShape(50)).background(color))
            Text(repairText(status.trim()).replaceFirstChar { it.uppercase() }.take(16), color = color, style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
}

@Composable
private fun NativeHome(data: PainelData, role: String, userName: String, loading: Boolean, offline: Boolean, loadError: String, retry: () -> Unit, open: (PanelModule) -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(top = 18.dp, bottom = 220.dp)) {
        item { HomeHeaderV2(userName, role, retry) }
        item { HomeHeroV2(data, role, offline) }
        if (loading) item { LoadingCard() }
        if (offline) item { NoticeCard("Sem conexão: mostrando o último estado salvo.", retry, offline = true) }
        if (loadError.isNotBlank() && data.updatedAt.isBlank()) item {
            NoticeCard("Não foi possível carregar os dados do site. ${loadError.take(180)}", retry)
        }
        item { HomeFocusCard(data, role, open) }
        item {
            val quickModules = PanelModuleCatalog.visibleFor(role, data.roleAccess, data.pageMaintenance).take(6)
            HomeSectionHeading("Acesso rápido", "Atalhos para as áreas mais usadas", quickModules.size)
        }
        val quickModules = PanelModuleCatalog.visibleFor(role, data.roleAccess, data.pageMaintenance).take(6)
        items(quickModules.chunked(2), key = { row -> row.joinToString("|") { it.key } }) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { module ->
                    HomeQuickModuleCard(module, countFor(module.key, data), Modifier.weight(1f)) { open(module) }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun HomeFocusCard(data: PainelData, role: String, open: (PanelModule) -> Unit) {
    val inventoryAlerts = data.schoolInventoryMetrics.values.sumOf { it["alerts"]?.toIntOrNull() ?: 0 } + data.inventory.count { it.status.contains("def", true) || it.status.contains("manut", true) }
    val openCalls = data.calls.count { !it.status.contains("resolvido", true) && !it.status.contains("fechado", true) }
    val pendingSupervision = data.supervisors.count { it.status.contains("pend", true) || it.status.contains("aten", true) || it.fields.values.any { value -> value.contains("pend", true) } }
    val (title, detail, moduleKey, count) = when {
        inventoryAlerts > 0 -> Quadruple("Inventário pede revisão", "$inventoryAlerts item(ns) com alerta ou manutenção.", "inventory", inventoryAlerts)
        openCalls > 0 -> Quadruple("Fila de chamados aberta", "$openCalls chamado(s) ainda precisam de acompanhamento.", "calls", openCalls)
        pendingSupervision > 0 -> Quadruple("Supervisão tem pendências", "$pendingSupervision registro(s) exigem atenção no período.", "supervision", pendingSupervision)
        else -> Quadruple("Base operacional estável", "Nenhum alerta prioritário foi identificado no estado atual.", "schools", data.schools.size)
    }
    val attention = moduleKey != "schools"
    val accent = if (attention) WarningOrange else SuccessGreen
    val target = PanelModuleCatalog.all.first { it.key == moduleKey }
    val canOpen = PanelModuleCatalog.visibleFor(role, data.roleAccess, data.pageMaintenance).any { it.key == moduleKey }
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(21.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, accent.copy(alpha = .20f))) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(13.dp), color = accent.copy(alpha = .14f)) { Icon(if (attention) Icons.Default.PriorityHigh else Icons.Default.CheckCircle, "Prioridade", tint = accent, modifier = Modifier.padding(10.dp).size(21.dp)) }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("FOCO OPERACIONAL", color = accent, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(detail, color = Muted, style = MaterialTheme.typography.bodySmall)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(count.toString(), color = accent, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                if (canOpen) TextButton(onClick = { open(target) }, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp), colors = ButtonDefaults.textButtonColors(contentColor = accent)) { Text(if (attention) "Abrir" else "Ver escolas") }
            }
        }
    }
}

@Composable
private fun HomeQuickModuleCard(module: PanelModule, count: Int, modifier: Modifier = Modifier, open: () -> Unit) {
    val enabled = module.state != PanelModuleState.PLANNED
    val accent = when (module.state) {
        PanelModuleState.AVAILABLE -> SuccessGreen
        PanelModuleState.READ_ONLY -> AccentBlue
        PanelModuleState.PLANNED -> WarningOrange
    }
    Surface(
        modifier = modifier.heightIn(min = 116.dp).clickable(enabled = enabled, onClick = open),
        shape = RoundedCornerShape(18.dp),
        color = PanelGlass,
        border = BorderStroke(1.dp, accent.copy(alpha = .18f))
    ) {
        Column(Modifier.fillMaxWidth().padding(13.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(11.dp), color = accent.copy(alpha = .13f)) {
                    Icon(moduleIcon(module.key), null, tint = accent, modifier = Modifier.padding(8.dp).size(18.dp))
                }
                Spacer(Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, "Abrir ${module.label}", tint = Muted, modifier = Modifier.size(17.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(module.label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(count.toString(), color = accent, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(if (enabled) "itens" else "em migração", color = Muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 2.dp), maxLines = 1)
                }
            }
        }
    }
}

private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

@Composable
private fun HomeHeader(userName: String, role: String, retry: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(16.dp), color = Lime.copy(alpha = .14f)) {
            Text(userName.trim().firstOrNull()?.uppercase() ?: "P", color = Lime, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelLarge)
            Text("Olá, ${userName.trim().substringBefore(" ").ifBlank { "usuário" }}", style = MaterialTheme.typography.titleLarge)
            Text("Visão geral · acesso $role", color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1)
        }
        IconButton(onClick = retry) { Icon(Icons.Default.Refresh, "Atualizar dados", tint = Muted) }
    }
}

@Composable
private fun HomeHero(data: PainelData, role: String, offline: Boolean) {
    val shape = RoundedCornerShape(24.dp)
    val dark = MaterialTheme.colorScheme.background == BackgroundDark
    val heroText = if (dark) HeroCardSecondaryText else TextSecondaryLight
    val heroBrush = if (dark) Brush.linearGradient(listOf(HeroCard, Color(0xFF17231F), Color(0xFF202A1B))) else Brush.linearGradient(listOf(Color(0xFFFDFEF8), SurfaceVariantLight, Color(0xFFE5F2D5)))
    Card(Modifier.fillMaxWidth().clip(shape).background(heroBrush), shape = shape, colors = CardDefaults.cardColors(containerColor = Color.Transparent), border = BorderStroke(1.dp, SuccessGreen.copy(alpha = .20f))) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("COMANDO DO MÊS", color = if (dark) AccentLime else Color(0xFF4F7D00), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text(if (offline) "Último estado salvo" else "Base operacional pronta", color = if (dark) Color.White else TextPrimaryLight, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
                Surface(shape = RoundedCornerShape(50.dp), color = SuccessGreen.copy(alpha = if (dark) .14f else .18f)) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(Modifier.size(6.dp).clip(RoundedCornerShape(50)).background(SuccessGreen))
                        Text(if (offline) "CACHE" else "ONLINE", color = if (dark) SuccessGreen else Color(0xFF087A61), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Text("${data.schools.size} escolas · ${data.calls.size} chamados · perfil $role", color = heroText, style = MaterialTheme.typography.bodySmall)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HeroMiniMetric(data.schools.size.toString(), "Escolas", if (dark) AccentLime else Color(0xFF4F7D00), Modifier.weight(1f))
                HeroMiniMetric(data.calls.size.toString(), "Chamados", if (dark) AccentBlue else Color(0xFF2879A5), Modifier.weight(1f))
                HeroMiniMetric(data.inventory.size.toString(), "Inventário", if (dark) WarningOrange else Color(0xFF8A6400), Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun HeroMiniMetric(value: String, label: String, accent: Color, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(15.dp), color = Color.Black.copy(alpha = if (MaterialTheme.colorScheme.background == BackgroundDark) .16f else .06f)) {
        Column(Modifier.padding(horizontal = 11.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(value, color = accent, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(label, color = if (MaterialTheme.colorScheme.background == BackgroundDark) HeroCardSecondaryText else TextSecondaryLight, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun HomeHeaderV2(userName: String, role: String, retry: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(15.dp), color = Lime.copy(alpha = .16f)) {
            Image(
                painterResource(com.painelure.app.R.drawable.brand_mark),
                contentDescription = "PainelURE",
                modifier = Modifier.padding(8.dp).size(38.dp)
            )
        }
        Spacer(Modifier.width(11.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text("Olá, ${userName.trim().substringBefore(" ").ifBlank { "usuário" }}", style = MaterialTheme.typography.titleLarge)
            Text("Visão geral · acesso $role", color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1)
        }
        FilledTonalIconButton(onClick = retry, shape = RoundedCornerShape(13.dp)) {
            Icon(Icons.Default.Refresh, "Atualizar dados", tint = Lime)
        }
    }
}

@Composable
private fun HomeHeroV2(data: PainelData, role: String, offline: Boolean) {
    val dark = MaterialTheme.colorScheme.background == BackgroundDark
    val heroText = if (dark) HeroCardSecondaryText else TextSecondaryLight
    val heroBrush = if (dark) Brush.linearGradient(listOf(HeroCard, Color(0xFF17231F), Color(0xFF202A1B))) else Brush.linearGradient(listOf(Color(0xFFFDFEF8), SurfaceVariantLight, Color(0xFFE5F2D5)))
    val shape = RoundedCornerShape(24.dp)
    Card(Modifier.fillMaxWidth().clip(shape).background(heroBrush), shape = shape, colors = CardDefaults.cardColors(containerColor = Color.Transparent), border = BorderStroke(1.dp, SuccessGreen.copy(alpha = .28f))) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("COMANDO DO MÊS", color = if (dark) AccentLime else Color(0xFF4F7D00), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text(if (offline) "Último estado salvo" else "Base operacional pronta", color = if (dark) Color.White else TextPrimaryLight, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
                Surface(shape = RoundedCornerShape(50.dp), color = SuccessGreen.copy(alpha = if (dark) .14f else .18f)) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(Modifier.size(6.dp).clip(RoundedCornerShape(50)).background(SuccessGreen))
                        Text(if (offline) "CACHE" else "ONLINE", color = if (dark) SuccessGreen else Color(0xFF087A61), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Text("${data.schools.size} escolas · ${data.calls.size} chamados · perfil $role", color = heroText, style = MaterialTheme.typography.bodySmall)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HeroMiniMetric(data.schools.size.toString(), "Escolas", if (dark) AccentLime else Color(0xFF4F7D00), Modifier.weight(1f))
                HeroMiniMetric(data.calls.size.toString(), "Chamados", if (dark) AccentBlue else Color(0xFF2879A5), Modifier.weight(1f))
                HeroMiniMetric(data.inventory.size.toString(), "Inventário", if (dark) WarningOrange else Color(0xFF8A6400), Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun NativeModuleHub(role: String, data: PainelData, open: (PanelModule) -> Unit) {
    val modules = PanelModuleCatalog.visibleFor(role, data.roleAccess, data.pageMaintenance)
    var query by remember { mutableStateOf("") }
    val filtered = modules.filter { module -> module.label.contains(query, true) || module.key.contains(query, true) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp), contentPadding = PaddingValues(top = 22.dp, bottom = 110.dp)) {
        item { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text("Central de módulos", style = MaterialTheme.typography.headlineMedium); Text("${modules.size} funções liberadas · perfil $role", color = Muted, style = MaterialTheme.typography.bodySmall) }; Surface(shape = RoundedCornerShape(50), color = AccentPurple.copy(alpha = .14f)) { Icon(Icons.Default.Apps, "Módulos", tint = AccentPurple, modifier = Modifier.padding(11.dp)) } } }
        item { PainelSearchField(query, { query = it }, "Buscar módulo") }
        if (filtered.isEmpty()) item { EmptyModule(PanelModule("modules", "Módulos", "modules", PanelModuleState.AVAILABLE)) }
        items(filtered.chunked(2), key = { row -> row.joinToString("|") { it.key } }) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { module ->
                    ModuleCardV2(module, countFor(module.key, data), Modifier.weight(1f)) { open(module) }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun HomeSectionHeading(title: String, subtitle: String, count: Int) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(repairText(title), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(repairText(subtitle), color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        Surface(shape = RoundedCornerShape(12.dp), color = Lime.copy(alpha = .13f)) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                Text(count.toString(), color = Lime, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("áreas", color = Muted, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun ModuleOverviewStrip(modules: List<PanelModule>) {
    val available = modules.count { it.state == PanelModuleState.AVAILABLE }
    val readOnly = modules.count { it.state == PanelModuleState.READ_ONLY }
    val planned = modules.count { it.state == PanelModuleState.PLANNED }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ModuleStatePill("Ativos", available, SuccessGreen, Modifier.weight(1f))
        ModuleStatePill("Consulta", readOnly, AccentBlue, Modifier.weight(1f))
        ModuleStatePill("Migração", planned, WarningOrange, Modifier.weight(1f))
    }
}

@Composable
private fun ModuleStatePill(label: String, count: Int, accent: Color, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(14.dp), color = accent.copy(alpha = .10f), border = BorderStroke(1.dp, accent.copy(alpha = .18f))) {
        Column(Modifier.padding(horizontal = 10.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(count.toString(), color = accent, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(label, color = Muted, style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
}

@Composable
private fun NativeModuleHubV2(role: String, data: PainelData, open: (PanelModule) -> Unit) {
    val modules = PanelModuleCatalog.visibleFor(role, data.roleAccess, data.pageMaintenance)
    var query by remember { mutableStateOf("") }
    var accessFilter by remember { mutableStateOf("Todos") }
    val filtered = modules.filter { module ->
        val matchesAccess = when (accessFilter) {
            "Operação" -> module.state == PanelModuleState.AVAILABLE
            "Consulta" -> module.state == PanelModuleState.READ_ONLY
            "Migração" -> module.state == PanelModuleState.PLANNED
            else -> true
        }
        matchesAccess && (module.label.contains(query, true) || module.key.contains(query, true))
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(top = 18.dp, bottom = 110.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("MÓDULOS", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text("Central operacional", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("${modules.size} funções liberadas · perfil $role", color = Muted, style = MaterialTheme.typography.bodySmall)
                }
                Surface(shape = RoundedCornerShape(15.dp), color = AccentPurple.copy(alpha = .14f)) {
                    Icon(Icons.Default.Apps, "Módulos", tint = AccentPurple, modifier = Modifier.padding(12.dp).size(23.dp))
                }
            }
        }
        item { ModuleOverviewStrip(modules) }
        item { PainelSearchField(query, { query = it }, "Buscar módulo") }
        item { FilterPanel("Filtrar por acesso") { FilterRow(listOf("Todos", "Operação", "Consulta", "Migração"), accessFilter) { accessFilter = it } } }
        if (filtered.isEmpty()) item { EmptyModule(PanelModule("modules", "Módulos", "modules", PanelModuleState.AVAILABLE)) }
        items(filtered, key = { it.key }) { module -> ModuleListCard(module, countFor(module.key, data)) { open(module) } }
    }
}

@Composable
private fun ModuleTitleBlock(title: String, count: Int, role: String, canCreate: Boolean, onCreate: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("PAINELURE  /  OPERAÇÃO", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text(repairText(title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("$count registro(s) · acesso $role", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        if (canCreate) {
            FilledTonalButton(onClick = onCreate, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 13.dp)) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(5.dp))
                Text("Novo")
            }
        }
    }
}

@Composable
private fun ModulePageHeader(title: String, subtitle: String, back: () -> Unit, action: (@Composable () -> Unit)? = null) {
    ModuleBackHeader(back)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("PAINELURE  /  VISÃO", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text(repairText(title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(repairText(subtitle), color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        action?.invoke()
    }
}

@Composable
private fun NativeModuleScreen(module: PanelModule, role: String, userName: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    if (module.key == "dashboard") {
        back()
        return
    }
    if (module.key == "schools") {
        NativeSchoolsScreen(role, data, repository, token, refresh, back)
        return
    }
    if (module.key == "inventory") {
        NativeInventoryScreen(role, data, repository, token, refresh, back)
        return
    }
    if (module.key == "ctc" || module.key == "calls") {
        NativeCtcScreen(module, role, data, repository, token, refresh, back)
        return
    }
    if (module.key == "cars") {
        NativeCarsScreen(role, data, repository, token, refresh, back)
        return
    }
    if (module.key == "calendar" || module.key == "rede-2026") {
        NativeCalendarScreen(module, role, userName, data, repository, token, refresh, back)
        return
    }
    if (module.key == "supervision") {
        NativeSupervisionScreen(role, data, repository, token, refresh, back)
        return
    }
    if (module.key == "network") {
        NativeNetworkScreen(role, data, back)
        return
    }
    if (module.key == "contacts") {
        NativeContactsScreen(role, data, back)
        return
    }
    if (module.key == "satisfaction") {
        NativeSatisfactionScreen(role, data, back)
        return
    }
    if (module.key == "admin") {
        NativeAdminModuleScreen(role, repository, token, back)
        return
    }
    if (module.key == "internal") {
        NativeInternalScreen(role, data, repository, token, refresh, back)
        return
    }
    if (module.key == "bi-equipment") {
        NativeBiEquipmentScreen(role, data, back)
        return
    }
    if (module.key == "reports") {
        NativeReportsScreen(role, data, back)
        return
    }
    if (module.key == "quality") {
        NativeQualityScreen(role, data, back)
        return
    }
    if (module.key == "profiles") {
        NativeProfilesScreen(role, data, back)
        return
    }
    if (module.key in setOf("reports", "bi-equipment", "internal", "profiles", "quality")) {
        NativeInsightsScreen(module, role, data, back)
        return
    }
    val records = if (module.key == "bi-equipment") data.inventory.map { item ->
        PanelRecord(
            item.name,
            listOf(item.school, item.serial, item.patrimony).filter(String::isNotBlank).joinToString(" · "),
            item.status,
            mapOf("school" to item.school, "type" to item.name, "serial" to item.serial, "patrimony" to item.patrimony, "responsible" to item.responsible)
        )
    } else recordsFor(module.key, data)
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    var operationOpen by remember { mutableStateOf(false) }
    val filtered = records.filter { listOf(it.title, it.subtitle, it.status).any { value -> value.contains(query, true) } }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader(module.label, "${filtered.size} registro(s) · acesso $role", back) { if (module.key in setOf("calls", "ctc", "cars", "calendar", "inventory")) FilledTonalButton({ operationOpen = true }, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) { Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(5.dp)); Text("Novo") } } }
        item { SummaryStrip(listOf(
            records.size.toString() to "Total",
            filtered.size.toString() to "Exibidos",
            records.count { it.status.isNotBlank() }.toString() to "Com status"
        )) }
        item { PainelSearchField(query, { query = it }, "Buscar em ${module.label}") }
        if (filtered.isEmpty()) item { if (records.isEmpty()) EmptyModule(module) else SearchEmptyState(query) }
        items(filtered.take(250), key = { "${module.key}:${it.title}:${it.subtitle}" }) { record -> NativeRecordCard(record) { selected = record } }
    }
    if (operationOpen) MobileOperationSheet(repository, token) { operationOpen = false; refresh() }
    selected?.let { record -> RecordDetailDialog(module.label, record) { selected = null } }
}

@Composable
private fun SearchEmptyState(query: String) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 25.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Surface(shape = RoundedCornerShape(16.dp), color = AccentBlue.copy(alpha = .13f)) {
                Icon(Icons.Default.SearchOff, "Nenhum resultado", tint = AccentBlue, modifier = Modifier.padding(12.dp).size(25.dp))
            }
            Text("Nenhum resultado", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Não encontramos registros para “${repairText(query)}”.", color = Muted, style = MaterialTheme.typography.bodySmall, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}

@Composable
private fun NativeProfilesScreen(role: String, data: PainelData, back: () -> Unit) {
    val defaultRoles = listOf("Administrador", "Supervisao", "Tecnicos CTC", "SETEC", "SEINTEC", "CTC", "Gabinete", "Dirigente", "SEOM", "Carros", "Pedagogico", "Consulta")
    val profileRoles = data.profiles.mapNotNull { it.fields["name"] ?: it.fields["role"] ?: it.title }.filter(String::isNotBlank)
    val roles = (defaultRoles + profileRoles).distinct()
    var query by remember { mutableStateOf("") }
    val filtered = roles.filter { it.contains(query, true) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Perfis", "Matriz de acesso · visualização para $role", back) }
        item { PainelSearchField(query, { query = it }, "Buscar perfil") }
        items(filtered, key = { "profile:$it" }) { profileRole ->
            val modules = PanelModuleCatalog.visibleFor(profileRole, data.roleAccess, data.pageMaintenance)
            val profileDescription = data.profiles.firstOrNull { (it.fields["name"] ?: it.fields["role"] ?: it.title).equals(profileRole, true) }?.subtitle.orEmpty()
            ProfileAccessCard(profileRole, modules, profileDescription)
        }
    }
}

@Composable
private fun ProfileAccessCard(profileRole: String, modules: List<PanelModule>, description: String) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, AccentPurple.copy(alpha = .16f))) {
        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(11.dp), color = AccentPurple.copy(alpha = .14f)) { Icon(Icons.Default.Badge, "Perfil", tint = AccentPurple, modifier = Modifier.padding(9.dp).size(19.dp)) }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) { Text(profileRole, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text("Matriz de acesso", color = Muted, style = MaterialTheme.typography.bodySmall) }
                Text("${modules.size}", color = AccentPurple, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
            if (description.isNotBlank()) Text(description, color = Muted, style = MaterialTheme.typography.bodySmall)
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                modules.take(8).forEach { module -> Surface(shape = RoundedCornerShape(50.dp), color = AccentPurple.copy(alpha = .10f)) { Text(module.label, color = AccentPurple, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp), maxLines = 1) } }
                if (modules.size > 8) Text("+${modules.size - 8}", color = Muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(vertical = 6.dp))
            }
        }
    }
}

@Composable
private fun NativeQualityScreen(role: String, data: PainelData, back: () -> Unit) {
    val inventorySchools = data.inventory.map { it.school.trim().lowercase() }.filter(String::isNotBlank).toSet()
    val withoutInventory = data.schools.count { it.name.trim().lowercase() !in inventorySchools }
    val missingSchool = data.inventory.count { it.school.isBlank() }
    val missingEquipment = data.inventory.count { it.name.isBlank() }
    val missingSerial = data.inventory.count { it.serial.isBlank() }
    val missingPatrimony = data.inventory.count { it.patrimony.isBlank() }
    val alertAssets = data.inventory.count { it.status.isNotBlank() && !it.status.equals("ok", true) }
    val pendingSupervision = data.supervisors.count { it.status.contains("pend", true) || it.status.contains("aten", true) || it.fields.values.any { value -> value.contains("pend", true) } }
    val checks = listOf(
        PanelRecord("Inventário: escolas mapeadas", "${data.inventory.size} ativo(s); $missingSchool sem escola identificada", if (missingSchool > 0) "atenção" else "ok"),
        PanelRecord("Inventário: equipamentos identificados", "$missingEquipment ativo(s) sem tipo/nome", if (missingEquipment > 0) "atenção" else "ok"),
        PanelRecord("Identificação dos ativos", "Sem série: $missingSerial · sem patrimônio: $missingPatrimony", if (missingSerial + missingPatrimony > 0) "atenção" else "ok"),
        PanelRecord("Manutenção e defeito", "$alertAssets ativo(s) fora de OK", if (alertAssets > 0) "atenção" else "ok"),
        PanelRecord("Escolas sem inventário", "$withoutInventory escola(s) sem item vinculado", if (withoutInventory > 0) "atenção" else "ok"),
        PanelRecord("Supervisão mensal", "$pendingSupervision pendência(s) detectada(s)", if (pendingSupervision > 0) "atenção" else "ok"),
    ).plus(data.quality)
    var query by remember { mutableStateOf("") }
    val context = LocalContext.current
    val checkpointPrefs = remember { context.getSharedPreferences("painelure-admin-checkpoints", Context.MODE_PRIVATE) }
    var checkpoints by remember { mutableStateOf(runCatching { val json = JSONObject(checkpointPrefs.getString("checks", "{}") ?: "{}"); json.keys().asSequence().associateWith { json.optString(it) } }.getOrDefault(emptyMap())) }
    val filtered = checks.filter { listOf(it.title, it.subtitle, it.status).any { value -> value.contains(query, true) } }
    val warnings = checks.count { it.status != "ok" }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Qualidade", "Checklist do painel · perfil $role", back) }
        item { SummaryStrip(listOf(checks.size.toString() to "Verificações", (checks.size - warnings).coerceAtLeast(0).toString() to "OK", warnings.toString() to "Revisar"), warnings > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar diagnóstico") }
        if (role.contains("administrador", true)) item {
            val tasks = listOf("inventory-lookups" to "Resolver nomes do inventário", "brand-logo" to "Refazer logo da barra lateral", "inventory-source" to "Validar planilha de equipamentos", "supervision-month" to "Conferir supervisão por mês", "cars-source" to "Conferir agenda de carros", "satisfaction-source" to "Definir pesquisa de satisfação", "home-review" to "Revisar utilidade da inicial", "official-sources" to "Rodar atualização geral")
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, AccentPurple.copy(alpha = .16f))) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("Checkpoints administrativos", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text("Acompanhe pendências de implantação", color = Muted, style = MaterialTheme.typography.bodySmall); tasks.forEach { (id, title) -> Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Checkbox(checked = checkpoints[id] == "true", onCheckedChange = { checked -> checkpoints = checkpoints + (id to checked.toString()); checkpointPrefs.edit().putString("checks", JSONObject(checkpoints).toString()).apply() }); Text(title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f)) } } } }
        }
        items(filtered, key = { "quality:${it.title}" }) { check -> QualityCheckCard(check) }
    }
}

@Composable
private fun QualityCheckCard(check: PanelRecord) {
    val ok = check.status.equals("ok", true)
    val accent = if (ok) SuccessGreen else WarningOrange
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, accent.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(11.dp), color = accent.copy(alpha = .13f)) { Icon(if (ok) Icons.Default.CheckCircle else Icons.Default.WarningAmber, null, tint = accent, modifier = Modifier.padding(9.dp).size(19.dp)) }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text(check.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold); Text(check.subtitle, color = Muted, style = MaterialTheme.typography.bodySmall) }
            Surface(shape = RoundedCornerShape(50.dp), color = accent.copy(alpha = .12f)) { Text(if (ok) "OK" else "REVISAR", color = accent, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)) }
        }
    }
}

@Composable
private fun ModuleExportTitleBlock(title: String, subtitle: String, onExport: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("PAINELURE  /  ANÁLISE", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        FilledTonalButton(onClick = onExport, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) {
            Icon(Icons.Default.FileDownload, null, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(5.dp))
            Text("CSV")
        }
    }
}

@Composable
private fun NativeReportsScreen(role: String, data: PainelData, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    val context = LocalContext.current
    val openCalls = data.calls.count { !it.status.contains("resolvido", true) && !it.status.contains("fechado", true) }
    val pending = data.supervisors.count { it.status.contains("pend", true) || it.status.contains("aten", true) || it.fields.values.any { value -> value.contains("pend", true) } }
    val involvedSchools = (data.ctcVisits.map { it.fields["place"] ?: it.fields["school"] ?: it.subtitle } + data.calls.map { it.fields["school"] ?: it.subtitle } + data.supervisors.flatMap { listOf(it.subtitle, it.fields["assignedSchools"].orEmpty()) }).flatMap { it.split(",", "|", ";") }.map { it.trim() }.filter(String::isNotBlank).distinct().size
    val reportRows = listOf(
        PanelRecord("Visitas técnicas CTC", "${data.ctcVisits.size} compromisso(s) técnico(s) carregado(s)", if (data.ctcVisits.isEmpty()) "info" else "ok"),
        PanelRecord("Visitas de supervisão", "${data.supervisors.size} responsável(is) e registro(s) disponível(is)", if (data.supervisors.isEmpty()) "info" else "ok"),
        PanelRecord("Pendências", "$pending visita(s) ou acompanhamento(s) requerem atenção", if (pending > 0) "atenção" else "ok"),
        PanelRecord("Deslocamentos oficiais", "${data.cars.size} reserva(s) de carro carregada(s)", if (data.cars.isEmpty()) "info" else "ok"),
        PanelRecord("Chamados", "$openCalls chamado(s) aberto(s) de ${data.calls.size}", if (openCalls > 0) "atenção" else "ok"),
        PanelRecord("Escolas acompanhadas", "$involvedSchools escola(s) referenciada(s) em operações", "ok")
    )
    val filtered = reportRows.filter { listOf(it.title, it.subtitle, it.status).any { value -> value.contains(query, true) } }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { writer ->
            writer.write("Indicador,Detalhe,Status\n")
            filtered.forEach { row -> writer.write("${csvCell(row.title)},${csvCell(row.subtitle)},${csvCell(row.status)}\n") }
        }
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModuleBackHeader(back) }
        item { ModuleExportTitleBlock("Relatórios e BI", "Consolidado operacional · perfil $role") { exportLauncher.launch("painelure-relatorio.csv") } }
        item { SummaryStrip(listOf(data.ctcVisits.size.toString() to "CTC", data.supervisors.size.toString() to "Supervisão", pending.toString() to "Pendências", data.cars.size.toString() to "Carros", "$openCalls/${data.calls.size}" to "Chamados", involvedSchools.toString() to "Escolas"), pending > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar indicador ou relatório") }
        item { Text("Resumo operacional", style = MaterialTheme.typography.titleLarge) }
        items(filtered, key = { "report:${it.title}" }) { row -> NativeRecordCard(row) { selected = row } }
        item { Text("Relatórios previstos", style = MaterialTheme.typography.titleLarge) }
        items(listOf("Relatório de visita técnica", "Relatório de visita de supervisão", "Relatório de deslocamento", "Relatório de acompanhamento escolar", "Relatório de ocorrência/chamado", "Relatório de satisfação"), key = { "planned:$it" }) { title -> PlannedReportCard(title) }
    }
    selected?.let { row -> RecordDetailDialog("Relatórios", row) { selected = null } }
}

@Composable
private fun PlannedReportCard(title: String) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .38f)), border = BorderStroke(1.dp, AccentPurple.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(10.dp), color = AccentPurple.copy(alpha = .14f)) { Icon(Icons.Default.Description, null, tint = AccentPurple, modifier = Modifier.padding(8.dp).size(18.dp)) }
            Spacer(Modifier.width(11.dp))
            Text(title, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
            Text("planejado", color = AccentPurple, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun NativeBiEquipmentScreen(role: String, data: PainelData, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var schoolFilter by remember { mutableStateOf("Todas") }
    var statusFilter by remember { mutableStateOf("Todos") }
    var typeFilter by remember { mutableStateOf("Todos") }
    var selected by remember { mutableStateOf<InventoryItem?>(null) }
    val context = LocalContext.current
    val schools = listOf("Todas") + data.inventory.map { it.school }.filter(String::isNotBlank).distinct().sorted()
    val statuses = listOf("Todos") + data.inventory.map { it.status }.filter(String::isNotBlank).distinct().sorted()
    val types = listOf("Todos") + data.inventory.map { it.name }.filter(String::isNotBlank).distinct().sorted()
    val filtered = data.inventory.filter { item ->
        (schoolFilter == "Todas" || item.school == schoolFilter) &&
            (statusFilter == "Todos" || item.status == statusFilter) &&
            (typeFilter == "Todos" || item.name == typeFilter) &&
            listOf(item.school, item.name, item.serial, item.patrimony, item.responsible, item.status).any { it.contains(query, true) }
    }
    val alerts = filtered.count { it.status.contains("def", true) || it.status.contains("manut", true) || it.status.contains("garant", true) }
    val functioning = filtered.size - alerts
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { writer ->
            writer.write("Escola,Equipamento,Status,Série,Patrimônio,Responsável\n")
            filtered.forEach { item -> writer.write(listOf(item.school, item.name, item.status, item.serial, item.patrimony, item.responsible).joinToString(",") { csvCell(it) }.plus("\n")) }
        }
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModuleBackHeader(back) }
        item { ModuleExportTitleBlock("BI Equipamentos", "Análise do inventário · perfil $role") { exportLauncher.launch("painelure-bi-equipamentos.csv") } }
        item { SummaryStrip(listOf(filtered.size.toString() to "Equipamentos", functioning.toString() to "Funcionando", alerts.toString() to "Atenção", filtered.map { it.school }.filter(String::isNotBlank).distinct().size.toString() to "Escolas"), alerts > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar série, patrimônio, responsável...") }
        item { Text("Escola", color = Muted, style = MaterialTheme.typography.labelMedium); FilterRow(schools.take(5), schoolFilter) { schoolFilter = it } }
        item { Text("Status", color = Muted, style = MaterialTheme.typography.labelMedium); FilterRow(statuses.take(5), statusFilter) { statusFilter = it } }
        item { Text("Tipo", color = Muted, style = MaterialTheme.typography.labelMedium); FilterRow(types.take(5), typeFilter) { typeFilter = it } }
        if (filtered.isEmpty()) item { EmptyModule(PanelModule("bi-equipment", "BI Equipamentos", "bi-equipment", PanelModuleState.READ_ONLY)) }
        items(filtered.take(400), key = { it.id.ifBlank { "bi:${it.school}:${it.name}:${it.serial}:${it.patrimony}" } }) { item -> InventoryNativeCard(item) { selected = item } }
    }
    selected?.let { item -> InventoryDetailDialog(item) { selected = null } }
}

@Composable
private fun NativeInternalScreen(role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var jsonText by remember(data.internalJson) { mutableStateOf(data.internalJson) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val state = remember(jsonText) { runCatching { JSONObject(jsonText) }.getOrElse { JSONObject() } }
    val raffle = state.optJSONObject("raffle")
    val raffleEntries = raffle?.optJSONArray("entries")
    val coffee2 = state.optJSONObject("coffee2")
    val coffeeEntries = coffee2?.optJSONArray("entries")
    fun toggle(section: String, index: Int) {
        val next = runCatching { JSONObject(jsonText) }.getOrElse { JSONObject() }
        val array = next.optJSONObject(section)?.optJSONArray("entries") ?: return
        val row = array.optJSONObject(index) ?: return
        row.put("paid", !row.optBoolean("paid"))
        jsonText = next.toString()
        saving = true
        scope.launch { withContext(Dispatchers.IO) { repository.saveInternal(token, next) }; saving = false; refresh() }
    }
    fun toggleCoffee(monthKey: String, name: String) {
        val next = runCatching { JSONObject(jsonText) }.getOrElse { JSONObject() }
        val coffee = next.optJSONObject("coffee") ?: JSONObject().also { next.put("coffee", it) }
        val months = coffee.optJSONObject("months") ?: JSONObject().also { coffee.put("months", it) }
        val month = months.optJSONObject(monthKey) ?: JSONObject().also { months.put(monthKey, it) }
        val people = month.optJSONArray("people") ?: JSONArray().also { month.put("people", it) }
        var found = false
        for (index in 0 until people.length()) {
            val person = people.optJSONObject(index) ?: continue
            if (person.optString("name").equals(name, true)) {
                person.put("paid", !person.optBoolean("paid"))
                found = true
            }
        }
        if (!found) people.put(JSONObject().put("name", name).put("paid", true))
        jsonText = next.toString()
        saving = true
        scope.launch { withContext(Dispatchers.IO) { repository.saveInternal(token, next) }; saving = false; refresh() }
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Ferramentas internas", if (saving) "Salvando no servidor..." else "Café e rifa · perfil $role", back) }
        item { Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(21.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, AccentPurple.copy(alpha = .18f))) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Surface(shape = RoundedCornerShape(12.dp), color = AccentPurple.copy(alpha = .14f)) { Icon(Icons.Default.ConfirmationNumber, "Rifa", tint = AccentPurple, modifier = Modifier.padding(9.dp).size(20.dp)) }; Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text("RIFA", color = AccentPurple, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold); Text(raffle?.optString("prize").orEmpty().ifBlank { "Prêmio não informado" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text("R$ ${raffle?.optInt("price", 0) ?: 0} · ${raffle?.optString("winnerName").orEmpty().ifBlank { "Ganhadora pendente" }}", color = Muted, style = MaterialTheme.typography.bodySmall) } } } }
        item { Text("Cartela da rifa", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 3.dp)) }
        if (raffleEntries == null || raffleEntries.length() == 0) item { Text("Nenhuma cartela carregada.", color = Muted) }
        if (raffleEntries != null) items((0 until raffleEntries.length()).toList(), key = { "raffle:$it" }) { index ->
            val row = raffleEntries.optJSONObject(index) ?: JSONObject()
            InternalToggleRow("${row.optInt("number", index + 1)} · ${row.optString("chosenName")}", row.optString("buyer").takeIf { it.isNotBlank() }?.let { "Comprador: $it" } ?: "Sem comprador", row.optBoolean("paid")) { toggle("raffle", index) }
        }
        item { Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(21.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, SuccessGreen.copy(alpha = .18f))) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Surface(shape = RoundedCornerShape(12.dp), color = SuccessGreen.copy(alpha = .14f)) { Icon(Icons.Default.LocalCafe, "Café", tint = SuccessGreen, modifier = Modifier.padding(9.dp).size(20.dp)) }; Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text("CAFÉ 2.0", color = SuccessGreen, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold); Text("Vaquinha mensal", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text("Contribuição: R$ ${coffee2?.optInt("amount", 0) ?: 0}", color = Muted, style = MaterialTheme.typography.bodySmall) } } } }
        item {
            val coffee = state.optJSONObject("coffee")
            val months = coffee?.optJSONObject("months")
            val monthKeys = listOf("2026-06", "2026-07", "2026-08", "2026-09", "2026-10")
            val names = listOf("Jefferson", "Elcio", "Gustavo", "Rodolfo", "Richard")
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Vaquinha do café", style = MaterialTheme.typography.titleLarge)
                Text("R$ 50 por pessoa · junho a outubro", color = Muted)
                monthKeys.forEach { monthKey ->
                    val people = months?.optJSONObject(monthKey)?.optJSONArray("people")
                    Text(monthKey, style = MaterialTheme.typography.titleMedium)
                    names.forEach { name ->
                        val paid = (0 until (people?.length() ?: 0)).asSequence().mapNotNull { people?.optJSONObject(it) }.firstOrNull { it.optString("name").equals(name, true) }?.optBoolean("paid") == true
                        InternalToggleRow(name, "Vaquinha mensal", paid) { toggleCoffee(monthKey, name) }
                    }
                }
            }
        }
        if (coffeeEntries != null) items((0 until coffeeEntries.length()).toList(), key = { "coffee:$it" }) { index ->
            val row = coffeeEntries.optJSONObject(index) ?: JSONObject()
            InternalToggleRow(row.optString("name", "Participante"), "Contribuição única", row.optBoolean("paid")) { toggle("coffee2", index) }
        }
        item { Text("Os estados são sincronizados pela API e ficam disponíveis offline até a próxima atualização.", color = Muted, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun InternalToggleRow(title: String, subtitle: String, checked: Boolean, onToggle: () -> Unit) {
    val accent = if (checked) SuccessGreen else Muted
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, accent.copy(alpha = .16f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(11.dp), color = accent.copy(alpha = .13f)) { Icon(if (checked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked, null, tint = accent, modifier = Modifier.padding(8.dp).size(18.dp)) }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) { Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold); Text(subtitle, color = Muted, style = MaterialTheme.typography.bodySmall); Text(if (checked) "Pago" else "Pendente", color = accent, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold) }
            Switch(checked, { onToggle() }, colors = SwitchDefaults.colors(checkedThumbColor = BackgroundDark, checkedTrackColor = SuccessGreen, uncheckedThumbColor = Muted, uncheckedTrackColor = MaterialTheme.colorScheme.surfaceVariant))
        }
    }
}

@Composable
private fun NativeInsightsScreen(module: PanelModule, role: String, data: PainelData, back: () -> Unit) {
    val records = recordsFor(module.key, data)
    var query by remember { mutableStateOf("") }
    var schoolFilter by remember { mutableStateOf("Todos") }
    var statusFilter by remember { mutableStateOf("Todos") }
    var typeFilter by remember { mutableStateOf("Todos") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    val schools = listOf("Todos") + records.mapNotNull { it.fields["school"] }.filter(String::isNotBlank).distinct().sorted()
    val statuses = listOf("Todos") + records.map { it.status }.filter(String::isNotBlank).distinct().sorted()
    val types = listOf("Todos") + records.mapNotNull { it.fields["type"] ?: it.fields["category"] }.filter(String::isNotBlank).distinct().sorted()
    val filtered = records.filter { record ->
        (schoolFilter == "Todos" || record.fields["school"] == schoolFilter) &&
            (statusFilter == "Todos" || record.status.equals(statusFilter, true)) &&
            (typeFilter == "Todos" || (record.fields["type"] ?: record.fields["category"]).equals(typeFilter, true)) &&
            (listOf(record.title, record.subtitle, record.status).any { it.contains(query, true) } || record.fields.values.any { it.contains(query, true) })
    }
    val active = records.count { it.status.isBlank() || !it.status.contains("inativo", true) && !it.status.contains("fechado", true) }
    val alerts = records.count { it.status.contains("pend", true) || it.status.contains("erro", true) || it.status.contains("crit", true) }
    val description = when (module.key) {
        "reports" -> "Consultas, relatórios operacionais e indicadores consolidados."
        "bi-equipment" -> "Visão analítica dos equipamentos e do inventário."
        "internal" -> "Ferramentas e dados internos sincronizados com o painel."
        "profiles" -> "Perfis, funções e regras de acesso disponíveis no sistema."
        else -> "Indicadores de qualidade, pendências e consistência dos dados."
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader(module.label, "$description · perfil $role", back) }
        item { SummaryStrip(listOf(records.size.toString() to "Registros", active.toString() to "Ativos", alerts.toString() to "Alertas"), alerts > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar em ${module.label}") }
        if (module.key == "bi-equipment") {
            item { Text("Escola", style = MaterialTheme.typography.labelLarge); FilterRow(schools, schoolFilter) { schoolFilter = it } }
            item { Text("Status", style = MaterialTheme.typography.labelLarge); FilterRow(statuses, statusFilter) { statusFilter = it } }
            item { Text("Tipo", style = MaterialTheme.typography.labelLarge); FilterRow(types, typeFilter) { typeFilter = it } }
            item { TextButton(onClick = { query = ""; schoolFilter = "Todos"; statusFilter = "Todos"; typeFilter = "Todos" }) { Text("Limpar filtros") } }
        }
        if (filtered.isEmpty()) item { EmptyModule(module) }
        items(filtered.take(300), key = { "${module.key}:${it.title}:${it.subtitle}" }) { record -> NativeRecordCard(record) { selected = record } }
    }
    selected?.let { record -> RecordDetailDialog(module.label, record) { selected = null } }
}

@Composable
private fun NativeAdminModuleScreen(role: String, repository: PainelRepository, token: String, back: () -> Unit) {
    var overview by remember { mutableStateOf<AdminOverview?>(null) }
    var managementOpen by remember { mutableStateOf(false) }
    LaunchedEffect(token) { overview = withContext(Dispatchers.IO) { repository.adminOverview(token) }.getOrNull() }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Administração", "Gestão nativa · perfil $role", back) { FilledTonalButton({ managementOpen = true }, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 12.dp)) { Text("Gerenciar") } } }
        item { SummaryStrip(listOf((overview?.users?.size ?: 0).toString() to "Usuários", (overview?.audit?.size ?: 0).toString() to "Auditoria", (overview?.snapshots?.size ?: 0).toString() to "Snapshots", (overview?.sources?.size ?: 0).toString() to "Fontes", (overview?.imports?.size ?: 0).toString() to "Importações")) }
        item { Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), color = PanelGlass, border = BorderStroke(1.dp, AccentPurple.copy(alpha = .22f))) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.width(3.dp).height(44.dp).clip(RoundedCornerShape(50.dp)).background(AccentPurple.copy(alpha = .78f))); Spacer(Modifier.width(10.dp)); Surface(shape = RoundedCornerShape(12.dp), color = AccentPurple.copy(alpha = .14f)) { Icon(Icons.Default.AdminPanelSettings, "Administração", tint = AccentPurple, modifier = Modifier.padding(9.dp).size(19.dp)) }; Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) { Text("Central administrativa", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold); Text("Gerencie usuários, permissões, fontes e backups.", color = Muted, style = MaterialTheme.typography.bodySmall) }; PainelStatusBadge(if (overview == null) "carregando" else "online") } } }
        item { Text("Atividade recente", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 4.dp)) }
        if (overview?.audit.orEmpty().isEmpty()) item { EmptyModule(PanelModule("admin-audit", "Atividade", "admin", PanelModuleState.READ_ONLY)) }
        items((overview?.audit.orEmpty()).take(100), key = { it.id }) { entry -> Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(17.dp), color = PanelGlass, border = BorderStroke(1.dp, PanelBorder)) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) { Box(Modifier.width(3.dp).height(42.dp).clip(RoundedCornerShape(50.dp)).background(AccentBlue.copy(alpha = .72f))); Spacer(Modifier.width(10.dp)); Surface(shape = RoundedCornerShape(10.dp), color = AccentBlue.copy(alpha = .13f)) { Icon(Icons.Default.History, "Atividade", tint = AccentBlue, modifier = Modifier.padding(8.dp).size(18.dp)) }; Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text(entry.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold); if (entry.detail.isNotBlank()) Text(entry.detail, color = Muted, style = MaterialTheme.typography.bodySmall); if (entry.createdAt.isNotBlank()) Text(entry.createdAt, color = Muted, style = MaterialTheme.typography.labelSmall) } } } }
    }
    if (managementOpen) AdminManagementDialog(repository, token) { managementOpen = false; overview = null }
}

@Composable
private fun NativeInventoryScreen(role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var selectedStatus by remember { mutableStateOf("Todos") }
    var issueFilter by remember { mutableStateOf("Todos") }
    var selected by remember { mutableStateOf<InventoryItem?>(null) }
    var operationOpen by remember { mutableStateOf(false) }
    val statuses = listOf("Todos") + data.inventory.map { it.status }.filter(String::isNotBlank).distinct().sorted()
    val filtered = data.inventory.filter { item ->
        (selectedStatus == "Todos" || item.status == selectedStatus) && when (issueFilter) {
            "Alertas" -> item.status.contains("def", true) || item.status.contains("manut", true) || item.status.contains("aten", true)
            "Sem série" -> item.serial.isBlank()
            "Sem patrimônio" -> item.patrimony.isBlank()
            "IDs pendentes" -> item.school.contains("#") || item.name.contains("#")
            else -> true
        }
    }.filter { item -> listOf(item.name, item.school, item.serial, item.patrimony, item.status).any { it.contains(query, true) } }
    val alerts = data.inventory.count { it.status.contains("def", true) || it.status.contains("manut", true) || it.status.contains("aten", true) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Inventário", "${filtered.size} registro(s) · acesso $role", back) { FilledTonalButton({ operationOpen = true }, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) { Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(5.dp)); Text("Novo") } } }
        item { SummaryStrip(listOf("${data.inventory.size}" to "Total", "$alerts" to "Alertas", "${data.inventory.map { it.school }.filter(String::isNotBlank).distinct().size}" to "Escolas"), alerts > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar ativo, escola, série ou patrimônio") }
        item { FilterPanel("Filtrar por status") { FilterRow(statuses.take(5), selectedStatus) { selectedStatus = it } } }
        if (filtered.isEmpty()) item { EmptyModule(PanelModule("inventory", "Inventário", "inventory", PanelModuleState.AVAILABLE)) }
        item { FilterPanel("Pendências de cadastro") { FilterRow(listOf("Todos", "Alertas", "Sem série", "Sem patrimônio", "IDs pendentes"), issueFilter) { issueFilter = it } } }
        items(filtered.take(300), key = { it.id.ifBlank { "${it.school}:${it.name}:${it.serial}:${it.patrimony}" } }) { item -> InventoryNativeCard(item) { selected = item } }
    }
    if (operationOpen) MobileOperationSheet(repository, token) { operationOpen = false; refresh() }
    selected?.let { item -> InventoryDetailDialog(item) { selected = null } }
}

@Composable
private fun NativeCtcScreen(module: PanelModule, role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var selectedStatus by remember { mutableStateOf("Todos") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    var operationOpen by remember { mutableStateOf(false) }
    val visits = data.ctcVisits
    val calls = data.calls
    val records = if (module.key == "ctc") visits + calls else calls
    val statuses = listOf("Todos") + records.map { it.status }.filter(String::isNotBlank).distinct().sorted()
    val filtered = records.filter { selectedStatus == "Todos" || it.status.equals(selectedStatus, true) }
        .filter { listOf(it.title, it.subtitle, it.status).any { value -> value.contains(query, true) } }
    val openCalls = calls.count { !it.status.equals("resolvido", true) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader(if (module.key == "ctc") "Chamados CTC" else "Chamados", "${filtered.size} registro(s) · acesso $role", back) { FilledTonalButton({ operationOpen = true }, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) { Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(5.dp)); Text("Novo") } } }
        item { SummaryStrip(listOf("${calls.size}" to "Chamados", "$openCalls" to "Em aberto", "${visits.size}" to "Visitas"), openCalls > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar escola, título, técnico ou categoria") }
        item { Text("Status", color = Muted, style = MaterialTheme.typography.labelMedium); FilterRow(statuses.take(5), selectedStatus) { selectedStatus = it } }
        if (filtered.isEmpty()) item { EmptyModule(module) }
        items(filtered.take(250), key = { "${module.key}:${it.title}:${it.subtitle}:${it.status}" }) { record -> NativeRecordCard(record) { selected = record } }
    }
    if (operationOpen) MobileOperationSheet(repository, token) { operationOpen = false; refresh() }
    selected?.let { RecordDetailDialog(module.label, it) { selected = null } }
}

@Composable
private fun NativeCarsScreen(role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Todos") }
    var vehicle by remember { mutableStateOf("Todos") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    var operationOpen by remember { mutableStateOf(false) }
    val statuses = listOf("Todos") + data.cars.map { it.status }.filter(String::isNotBlank).distinct().sorted()
    val vehicles = listOf("Todos") + data.cars.mapNotNull { it.fields["vehicle"] ?: it.fields["car"] ?: it.fields["carro"] }.filter(String::isNotBlank).distinct().sorted()
    val filtered = data.cars.filter { status == "Todos" || it.status.equals(status, true) }.filter { item ->
        vehicle == "Todos" || (item.fields["vehicle"] ?: item.fields["car"] ?: item.fields["carro"]).equals(vehicle, true)
    }.filter { item -> listOf(item.title, item.subtitle, item.status).any { it.contains(query, true) } || item.fields.values.any { it.contains(query, true) } }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Carros", "${filtered.size} registro(s) · acesso $role", back) { Row(verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = refresh) { Icon(Icons.Default.Refresh, "Atualizar dados", tint = Muted) }; FilledTonalButton({ operationOpen = true }, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) { Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(5.dp)); Text("Novo") } } } }
        item { SummaryStrip(listOf("${data.cars.size}" to "Agendamentos", "${data.cars.count { it.status.contains("pend", true) || it.status.contains("aberto", true) }}" to "Pendentes", "${vehicles.drop(1).size}" to "Veículos"), data.cars.any { it.status.contains("pend", true) || it.status.contains("aberto", true) }) }
        item { PainelSearchField(query, { query = it }, "Buscar destino, motorista ou veículo") }
        item { FilterPanel("Filtrar por status") { FilterRow(statuses, status) { status = it } } }
        item { FilterPanel("Filtrar por veículo") { FilterRow(vehicles, vehicle) { vehicle = it } } }
        if (filtered.isEmpty()) item { EmptyModule(PanelModule("cars", "Carros", "cars", PanelModuleState.AVAILABLE)) }
        items(filtered.take(250), key = { "car:${it.title}:${it.subtitle}:${it.status}" }) { item -> NativeRecordCard(item) { selected = item } }
    }
    if (operationOpen) MobileOperationSheet(repository, token) { operationOpen = false; refresh() }
    selected?.let { RecordDetailDialog("Carros", it) { selected = null } }
}

@Composable
private fun NativeCalendarScreen(module: PanelModule, role: String, userName: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf("Todos") }
    var operationOpen by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    val source = if (module.key == "rede-2026") data.rede2026 else data.calendar
    val initialMonth = remember(source) {
        val monthPattern = Regex("(?:(20\\d{2})[-/](0?[1-9]|1[0-2]))|(?:(0?[1-9]|1[0-2])[-/](20\\d{2}))")
        val counts = source.flatMap { item ->
            item.fields.values.flatMap { value ->
                monthPattern.findAll(value).map { match ->
                    val year = match.groupValues[1].ifBlank { match.groupValues[4] }
                    val month = match.groupValues[2].ifBlank { match.groupValues[3] }
                    runCatching { YearMonth.of(year.toInt(), month.toInt()) }.getOrNull()
                }.toList()
            }
        }.filterNotNull().groupingBy { it }.eachCount()
        counts.maxWithOrNull(compareBy<Map.Entry<YearMonth, Int>> { it.value }.thenBy { it.key })?.key ?: YearMonth.now()
    }
    var month by remember(initialMonth) { mutableStateOf(initialMonth) }
    val filtered = source.filter { item ->
        val dateText = listOf("date", "data", "value", "when", "quando", "period", "periodo").mapNotNull { item.fields[it] }.joinToString(" ")
        val monthKey = month.toString()
        val monthMatch = dateText.isBlank() || dateText.contains(monthKey) || dateText.contains("${month.monthValue.toString().padStart(2, '0')}/${month.year}") || dateText.contains("${month.monthValue}/${month.year}")
        val marker = listOf(item.fields["scope"], item.fields["type"], item.fields["category"], item.fields["categoria"]).filterNotNull().joinToString(" ")
        val owner = listOf("owner", "user", "assignee", "responsible", "login", "username").mapNotNull { item.fields[it] }.joinToString(" ")
        val personal = marker.contains("personal", true) || marker.contains("pessoal", true)
        val ownerMatch = userName.isBlank() || owner.contains(userName, true)
        val modeMatch = mode == "Todos" || (mode == "Pessoal" && personal && ownerMatch) || (mode == "Compartilhada" && !personal)
        monthMatch && modeMatch && (listOf(item.title, item.subtitle, item.status).any { it.contains(query, true) } || item.fields.values.any { it.contains(query, true) })
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader(if (module.key == "rede-2026") "Redes 2026" else "Agenda", "${filtered.size} registro(s) · acesso $role", back) { if (module.key == "calendar") FilledTonalButton({ operationOpen = true }, shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) { Icon(Icons.Default.Add, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(5.dp)); Text("Novo") } } }
        item { SummaryStrip(listOf(
            filtered.size.toString() to "No período",
            source.count { it.fields.values.any { value -> value.contains("pessoal", true) || value.contains("personal", true) } }.toString() to "Pessoais",
            source.count { it.fields.values.none { value -> value.contains("pessoal", true) || value.contains("personal", true) } }.toString() to "Compartilhados"
        )) }
        item { PainelSearchField(query, { query = it }, "Buscar evento, data ou assunto") }
        item { Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(17.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) { Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) { IconButton(onClick = { month = month.minusMonths(1) }) { Icon(Icons.Default.ChevronLeft, "Mês anterior", tint = Lime) }; Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Surface(shape = RoundedCornerShape(9.dp), color = Lime.copy(alpha = .13f)) { Icon(Icons.Default.Event, null, tint = Lime, modifier = Modifier.padding(6.dp).size(17.dp)) }; Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(1.dp)) { Text("PERÍODO", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold); Text(monthLabel(month), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) } }; IconButton(onClick = { month = month.plusMonths(1) }) { Icon(Icons.Default.ChevronRight, "Próximo mês", tint = Lime) } } } }
        item { FilterPanel("Visualização") { FilterRow(listOf("Todos", "Compartilhada", "Pessoal"), mode) { mode = it } } }
        if (filtered.isEmpty()) item { EmptyModule(module) }
        items(filtered.take(300), key = { "calendar:${it.title}:${it.subtitle}:${it.status}" }) { item -> NativeRecordCard(item) { selected = item } }
    }
    if (operationOpen) MobileOperationSheet(repository, token) { operationOpen = false; refresh() }
    selected?.let { RecordDetailDialog(module.label, it) { selected = null } }
}

@Composable
private fun NativeSupervisionScreen(role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    var justificationOpen by remember { mutableStateOf(false) }
    var justificationSupervisor by remember { mutableStateOf("") }
    val supervisors = data.supervisors.filter { item -> listOf(item.title, item.subtitle, item.status).any { it.contains(query, true) } || item.fields.values.any { it.contains(query, true) } }
    val pending = supervisors.count { item -> item.status.contains("pend", true) || item.status.contains("aten", true) || item.fields.values.any { it.contains("pend", true) } }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Supervisão", "${supervisors.size} supervisor(es) · perfil $role", back) { if (PermissionPolicy.can(role, "supervision", data.roleAccess)) FilledTonalButton({ justificationSupervisor = supervisors.firstOrNull()?.title.orEmpty(); justificationOpen = justificationSupervisor.isNotBlank() }, enabled = supervisors.isNotEmpty(), shape = RoundedCornerShape(13.dp), contentPadding = PaddingValues(horizontal = 11.dp)) { Text("Justificativa") } } }
        item { SummaryStrip(listOf("${supervisors.size}" to "Supervisores", "$pending" to "Pendências", "${data.ctcVisits.size}" to "Visitas"), pending > 0) }
        item { PainelSearchField(query, { query = it }, "Buscar supervisor, escola ou status") }
        if (supervisors.isEmpty()) item { EmptyModule(PanelModule("supervision", "Supervisão", "supervision", PanelModuleState.READ_ONLY)) }
        items(supervisors.take(200), key = { "supervisor:${it.title}:${it.subtitle}" }) { supervisor -> SupervisorNativeCard(supervisor, data, PermissionPolicy.can(role, "supervision", data.roleAccess), { selected = supervisor }) { justificationSupervisor = supervisor.title; justificationOpen = true } }
    }
    if (justificationOpen) JustificationDialog(repository, token, justificationSupervisor) { justificationOpen = false; refresh() }
    selected?.let { RecordDetailDialog("Supervisão", it) { selected = null } }
}

@Composable
private fun NativeNetworkScreen(role: String, data: PainelData, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var schoolFilter by remember { mutableStateOf("Todas") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    val privileged = listOf("administrador", "setec", "seintec", "tecnicos ctc", "ctc").any { role.contains(it, true) }
    val schools = listOf("Todas") + data.networks.map { it.title }.filter(String::isNotBlank).distinct().sorted()
    val networks = data.networks.filter { item -> (schoolFilter == "Todas" || item.title == schoolFilter) && (listOf(item.title, item.subtitle, item.status).any { it.contains(query, true) } || item.fields.values.any { it.contains(query, true) }) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Redes e câmeras", "${networks.size} escola(s) · perfil $role", back) }
        item { SummaryStrip(listOf(networks.size.toString() to "Redes", networks.count { it.status.isNotBlank() }.toString() to "Com status", schools.size.minus(1).coerceAtLeast(0).toString() to "Escolas")) }
        item { PainelSearchField(query, { query = it }, "Buscar escola ou equipamento") }
        item { FilterPanel("Filtrar por escola") { FilterRow(schools, schoolFilter) { schoolFilter = it } } }
        item { Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, (if (privileged) SuccessGreen else WarningOrange).copy(alpha = .18f))) { Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) { Surface(shape = RoundedCornerShape(11.dp), color = (if (privileged) SuccessGreen else WarningOrange).copy(alpha = .13f)) { Icon(Icons.Default.Security, "Segurança", tint = if (privileged) SuccessGreen else WarningOrange, modifier = Modifier.padding(9.dp).size(19.dp)) }; Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text("Acesso às credenciais", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold); Text(if (privileged) "Credenciais liberadas para este perfil técnico/administrativo." else "Credenciais protegidas. Consulte apenas o estado da infraestrutura.", color = Muted, style = MaterialTheme.typography.bodySmall) }; PainelStatusBadge(if (privileged) "liberado" else "protegido") } } }
        if (networks.isEmpty()) item { EmptyModule(PanelModule("network", "Redes", "network", PanelModuleState.READ_ONLY)) }
        items(networks.take(200), key = { "network:${it.title}:${it.subtitle}" }) { item -> NetworkNativeCard(item, privileged) { selected = item } }
    }
    selected?.let { NetworkDetailDialog(it, privileged) { selected = null } }
}

@Composable
private fun NativeContactsScreen(role: String, data: PainelData, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var sectorFilter by remember { mutableStateOf("Todos") }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    val allSectors = listOf("Todos") + data.contacts.mapNotNull { it.fields["sector"] ?: it.fields["setor"] }.filter(String::isNotBlank).distinct().sorted()
    val contacts = data.contacts.filter { item ->
        val itemSector = item.fields["sector"] ?: item.fields["setor"].orEmpty()
        (sectorFilter == "Todos" || itemSector == sectorFilter) && (listOf(item.title, item.subtitle, item.status).any { it.contains(query, true) } || item.fields.values.any { it.contains(query, true) })
    }
    val sectors = allSectors.drop(1)
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Contatos", "${contacts.size} contato(s) · perfil $role", back) }
        item { PainelSearchField(query, { query = it }, "Buscar nome, setor, cargo ou telefone") }
        item { FilterRow(allSectors, sectorFilter) { sectorFilter = it } }
        item { SummaryStrip(listOf(contacts.size.toString() to "Exibidos", sectors.size.toString() to "Setores", contacts.count { (it.fields["phone"] ?: it.fields["telefone"]).orEmpty().isNotBlank() || it.fields["email"].orEmpty().isNotBlank() }.toString() to "Com contato")) }
        if (sectors.isNotEmpty()) item { FilterPanel("Setores encontrados") { Text(sectors.joinToString(" · ") { repairText(it) }, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis) } }
        if (contacts.isEmpty()) item { EmptyModule(PanelModule("contacts", "Contatos", "contacts", PanelModuleState.READ_ONLY)) }
        items(contacts.take(250), key = { "contact:${it.title}:${it.subtitle}" }) { item -> ContactNativeCard(item) { selected = item } }
    }
    selected?.let { RecordDetailDialog("Contato", it) { selected = null } }
}

@Composable private fun ContactNativeCard(record: PanelRecord, open: () -> Unit) {
    val context = LocalContext.current
    val phone = (record.fields["phone"] ?: record.fields["telefone"]).orEmpty()
    val email = record.fields["email"].orEmpty()
    val sector = record.fields["sector"] ?: record.fields["setor"] ?: record.subtitle
    val role = record.fields["role"].orEmpty()
    Surface(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(19.dp), color = PanelSurface, border = BorderStroke(1.dp, AccentBlue.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).height(92.dp).clip(RoundedCornerShape(50.dp)).background(AccentBlue.copy(alpha = .78f)))
            Spacer(Modifier.width(10.dp))
            Surface(shape = RoundedCornerShape(13.dp), color = AccentBlue.copy(alpha = .13f)) { Icon(Icons.Default.Person, null, tint = AccentBlue, modifier = Modifier.padding(10.dp).size(20.dp)) }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) { Text(repairText(record.title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), maxLines = 2); Icon(Icons.Default.ChevronRight, "Abrir contato", tint = Muted, modifier = Modifier.size(18.dp)) }
                if (sector.isNotBlank()) Text(repairText(sector), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1)
                Text(repairText(listOf(role, phone, email).filter(String::isNotBlank).joinToString(" · ").ifBlank { "Dados de contato pendentes" }), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (phone.isNotBlank() || email.isNotBlank()) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (phone.isNotBlank()) FilledTonalButton({ runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${phone.filter { it.isDigit() || it == '+' }}"))) } }, shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 11.dp, vertical = 6.dp)) { Icon(Icons.Default.Phone, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(5.dp)); Text("Ligar") }
                    if (email.isNotBlank()) FilledTonalButton({ runCatching { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${Uri.encode(email)}"))) } }, shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 11.dp, vertical = 6.dp)) { Icon(Icons.Default.Email, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(5.dp)); Text("E-mail") }
                }
            }
        }
    }
}

@Composable
private fun NativeSatisfactionScreen(role: String, data: PainelData, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var sector by remember { mutableStateOf("Todos") }
    var month by remember { mutableStateOf("Todos") }
    var rating by remember { mutableStateOf("Todos") }
    var wait by remember { mutableStateOf("Todos") }
    var attendanceType by remember { mutableStateOf("Todos") }
    var filtersOpen by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<PanelRecord?>(null) }
    val sectors = listOf("Todos") + data.satisfaction.mapNotNull { it.fields["sector"] ?: it.fields["setor"] ?: it.fields["audience"] }.filter(String::isNotBlank).distinct().sorted()
    val months = listOf("Todos") + data.satisfaction.mapNotNull { it.fields["period"] ?: it.fields["month"] ?: it.fields["date"] }.filter(String::isNotBlank).distinct().sorted()
    val ratings = listOf("Todos") + data.satisfaction.mapNotNull { it.fields["rating"] ?: it.fields["score"] ?: it.status }.filter(String::isNotBlank).distinct().sorted()
    val waits = listOf("Todos") + data.satisfaction.mapNotNull { it.fields["wait"] ?: it.fields["espera"] }.filter(String::isNotBlank).distinct().sorted()
    val attendanceTypes = listOf("Todos") + data.satisfaction.mapNotNull { it.fields["attendanceType"] ?: it.fields["type"] ?: it.fields["tipo"] }.filter(String::isNotBlank).distinct().sorted()
    val rows = data.satisfaction.filter { item ->
        val itemSector = item.fields["sector"] ?: item.fields["setor"] ?: item.fields["audience"].orEmpty()
        val itemMonth = item.fields["period"] ?: item.fields["month"] ?: item.fields["date"].orEmpty()
        val itemRating = item.fields["rating"] ?: item.fields["score"] ?: item.status
        val itemWait = item.fields["wait"] ?: item.fields["espera"].orEmpty()
        val itemType = item.fields["attendanceType"] ?: item.fields["type"] ?: item.fields["tipo"].orEmpty()
        (sector == "Todos" || itemSector == sector) && (month == "Todos" || itemMonth == month) && (rating == "Todos" || itemRating == rating) && (wait == "Todos" || itemWait == wait) && (attendanceType == "Todos" || itemType == attendanceType) && (listOf(item.title, item.subtitle, item.status).any { it.contains(query, true) } || item.fields.values.any { it.contains(query, true) })
    }
    val positive = rows.count { item -> listOf(item.status, item.subtitle, item.fields.values.joinToString(" ")).any { it.contains("bom", true) || it.contains("ótimo", true) || it.contains("sim", true) || it.contains("satis", true) } }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Pesquisa de satisfação", "${rows.size} resposta(s) · perfil $role", back) }
        item { SummaryStrip(listOf("${rows.size}" to "Respostas", "$positive" to "Positivas", (if (rows.isEmpty()) "0%" else "${(positive * 100 / rows.size)}%") to "Índice")) }
        item { PainelSearchField(query, { query = it }, "Buscar resposta, escola ou pergunta") }
        item {
            FilledTonalButton(onClick = { filtersOpen = !filtersOpen }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), contentPadding = PaddingValues(vertical = 11.dp)) {
                Icon(if (filtersOpen) Icons.Default.ExpandLess else Icons.Default.FilterList, "Filtros", modifier = Modifier.size(18.dp)); Spacer(Modifier.width(7.dp)); Text(if (filtersOpen) "Ocultar filtros" else "Mostrar filtros"); Spacer(Modifier.weight(1f)); Text(listOf(sector, month, rating, wait, attendanceType).count { it != "Todos" }.toString(), style = MaterialTheme.typography.labelSmall)
            }
        }
        if (filtersOpen) item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPanel("Setor") { FilterRow(sectors, sector) { sector = it } }
            FilterPanel("Mês") { FilterRow(months, month) { month = it } }
            FilterPanel("Avaliação") { FilterRow(ratings, rating) { rating = it } }
            FilterPanel("Espera") { FilterRow(waits, wait) { wait = it } }
            FilterPanel("Tipo de atendimento") { FilterRow(attendanceTypes, attendanceType) { attendanceType = it } }
            TextButton(onClick = { query = ""; sector = "Todos"; month = "Todos"; rating = "Todos"; wait = "Todos"; attendanceType = "Todos" }, modifier = Modifier.fillMaxWidth()) { Text("Limpar todos os filtros") }
        } }
        if (rows.isEmpty()) item { EmptyModule(PanelModule("satisfaction", "Pesquisa", "satisfaction", PanelModuleState.READ_ONLY)) }
        items(rows.take(300), key = { "satisfaction:${it.title}:${it.subtitle}" }) { item -> NativeRecordCard(item) { selected = item } }
    }
    selected?.let { RecordDetailDialog("Pesquisa de satisfação", it) { selected = null } }
}

@Composable
private fun NetworkNativeCard(record: PanelRecord, privileged: Boolean, open: () -> Unit) {
    val cameras = record.fields["cameras"] ?: record.fields["câmeras"] ?: ""
    val credentials = record.fields["credentials"] ?: ""
    Surface(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(19.dp), color = PanelGlass, border = BorderStroke(1.dp, AccentBlue.copy(alpha = .18f))) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) { Text(record.title, style = MaterialTheme.typography.titleMedium); if (record.subtitle.isNotBlank()) Text(record.subtitle, color = Muted); Text("Câmeras/DVR: ${if (cameras.isBlank()) "não informado" else cameras.take(80)}", color = Muted, style = MaterialTheme.typography.bodySmall); Text(if (privileged && credentials.isNotBlank()) "Credenciais disponíveis" else "Credenciais protegidas", color = if (privileged) Lime else Muted, style = MaterialTheme.typography.bodySmall) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NetworkDetailDialog(record: PanelRecord, privileged: Boolean, close: () -> Unit) {
    val hidden = setOf("password", "senha", "credentials", "credential", "user", "username", "usuario")
    val fields = record.fields.filter { it.value.isNotBlank() && (privileged || hidden.none { key -> it.key.contains(key, true) }) }.toList()
    var category by remember { mutableStateOf("Todos") }
    val categoryKeys = listOf("network", "ips", "cameras", "credentials").filter { key -> fields.any { it.first.contains(key, true) } }
    val visible = fields.filter { category == "Todos" || it.first.contains(category, true) }
    ModalBottomSheet(onDismissRequest = close, shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp), containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.align(Alignment.CenterHorizontally).width(38.dp).height(4.dp).clip(RoundedCornerShape(50.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = .18f)))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("REDE E CÂMERAS", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text(record.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = close) { Text("Fechar") }
            }
            if (categoryKeys.isNotEmpty()) FilterRow(listOf("Todos") + categoryKeys, category) { category = it }
            LazyColumn(Modifier.heightIn(max = 520.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(visible) { (key, value) ->
                    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .42f)) {
                        Column(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) { Text(key, color = Muted, style = MaterialTheme.typography.labelSmall); Text(value, style = MaterialTheme.typography.bodyMedium) }
                    }
                }
                if (visible.isEmpty()) item { Text("Nenhum detalhe liberado para este perfil.", color = Muted) }
            }
        }
    }
}

@Composable
private fun SupervisorNativeCard(record: PanelRecord, data: PainelData, canJustify: Boolean, open: () -> Unit, justify: () -> Unit) {
    val assigned = record.fields["assignedSchools"] ?: record.fields["schools"] ?: record.subtitle
    val visits = data.ctcVisits.count { visit -> assigned.isNotBlank() && assigned.split(",", "|", ";").any { school -> visit.fields.values.any { it.contains(school.trim(), true) } } }
    val accent = if (record.status.isBlank()) AccentPurple else statusAccent(record.status)
    Surface(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(19.dp), color = PanelGlass, border = BorderStroke(1.dp, accent.copy(alpha = .20f))) {
        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.width(3.dp).height(42.dp).clip(RoundedCornerShape(50.dp)).background(accent.copy(alpha = .78f))); Spacer(Modifier.width(10.dp)); Surface(shape = RoundedCornerShape(11.dp), color = accent.copy(alpha = .14f)) { Icon(Icons.Default.Visibility, null, tint = accent, modifier = Modifier.padding(8.dp).size(18.dp)) }; Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) { Text(repairText(record.title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 2); if (record.subtitle.isNotBlank()) Text(repairText(record.subtitle), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1) }; if (record.status.isNotBlank()) PainelStatusBadge(record.status) }
            Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(11.dp), color = accent.copy(alpha = .08f)) { Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Assignment, null, tint = accent, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(7.dp)); Text("$visits visita(s) relacionada(s)", color = Muted, style = MaterialTheme.typography.bodySmall) } }
            if (canJustify) FilledTonalButton(onClick = justify, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 11.dp, vertical = 8.dp)) { Icon(Icons.Default.EditNote, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(5.dp)); Text("Abrir justificativa") }
        }
    }
}

@Composable private fun FilterRow(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
        options.take(8).forEach { option ->
            val chosen = selected == option
            FilterChip(
                selected = chosen,
                onClick = { onSelect(option) },
                label = { Text(repairText(option).take(18), maxLines = 1) },
                shape = RoundedCornerShape(11.dp),
                colors = FilterChipDefaults.filterChipColors(containerColor = PanelGlass.copy(alpha = .50f), selectedContainerColor = Lime.copy(alpha = .20f), selectedLabelColor = Lime, selectedTrailingIconColor = Lime, labelColor = Muted),
                border = FilterChipDefaults.filterChipBorder(enabled = true, selected = chosen, borderColor = PanelBorder, selectedBorderColor = Lime.copy(alpha = .62f))
            )
        }
    }
}

@Composable
private fun FilterPanel(title: String, content: @Composable () -> Unit) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(8.dp), color = Lime.copy(alpha = .12f)) {
                    Icon(Icons.Default.Tune, null, tint = Lime, modifier = Modifier.padding(5.dp).size(14.dp))
                }
                Spacer(Modifier.width(7.dp))
                Text(repairText(title), color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            }
            content()
        }
    }
}

private fun monthLabel(month: YearMonth): String {
    val names = listOf("janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro")
    return "${names[month.monthValue - 1].replaceFirstChar { it.uppercase() }} de ${month.year}"
}

@Composable
private fun InventoryNativeCard(item: InventoryItem, open: () -> Unit) {
    val alert = item.status.contains("def", true) || item.status.contains("manut", true) || item.status.contains("aten", true)
    val accent = if (alert) DangerRed else AccentBlue
    Surface(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(19.dp), color = PanelSurface, border = BorderStroke(1.dp, accent.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).height(46.dp).clip(RoundedCornerShape(50.dp)).background(accent.copy(alpha = .78f)))
            Spacer(Modifier.width(10.dp))
            Surface(shape = RoundedCornerShape(13.dp), color = accent.copy(alpha = .13f)) { Icon(Icons.Default.Inventory2, null, tint = accent, modifier = Modifier.padding(10.dp).size(20.dp)) }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text(repairText(item.name), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 2); if (item.school.isNotBlank()) Text(repairText(item.school), color = Muted, style = MaterialTheme.typography.bodySmall); Text(repairText(listOf(item.serial, item.patrimony, item.responsible).filter(String::isNotBlank).joinToString(" · ").ifBlank { "Identificação pendente" }), color = if (alert) MaterialTheme.colorScheme.error else Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1) }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(5.dp)) { if (item.status.isNotBlank()) PainelStatusBadge(item.status); Icon(Icons.Default.ChevronRight, "Abrir item", tint = Muted, modifier = Modifier.size(18.dp)) }
        }
    }
}

@Composable
private fun InventoryDetailDialog(item: InventoryItem, close: () -> Unit) {
    RecordDetailDialog("Inventário", PanelRecord(item.name, item.school, item.status, mapOf("Escola" to item.school, "Série" to item.serial, "Patrimônio" to item.patrimony, "Responsável" to item.responsible, "Observações" to item.notes)), close)
}

@Composable private fun DetailLine(label: String, value: String) { if (value.isNotBlank()) Text("$label: $value") }

@Composable
private fun NativeSchoolsScreen(role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<School?>(null) }
    if (selected != null) {
        NativeSchoolDetail(selected!!, role, data, repository, token, refresh) { selected = null }
        return
    }
    val schools = data.schools.filter { listOf(it.name, it.city, it.phone, it.status).any { value -> value.contains(query, true) } }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModulePageHeader("Escolas", "${schools.size} unidade(s) · perfil $role", back) }
        item { SummaryStrip(listOf(schools.size.toString() to "Unidades", schools.map { it.city }.filter(String::isNotBlank).distinct().size.toString() to "Municípios", schools.count { it.status.isNotBlank() }.toString() to "Com status")) }
        item { PainelSearchField(query, { query = it }, "Buscar escola, cidade ou telefone") }
        items(schools, key = { it.id.ifBlank { it.name } }) { school -> SchoolNativeCard(school) { selected = school } }
        if (schools.isEmpty()) item { EmptyModule(PanelModule("schools", "Escolas", "schools", PanelModuleState.AVAILABLE)) }
    }
}

@Composable
private fun SchoolNativeCard(school: School, open: () -> Unit) {
    val accent = if (school.status.isBlank()) AccentBlue else statusAccent(school.status)
    Surface(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(19.dp), color = PanelSurface, border = BorderStroke(1.dp, accent.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).height(46.dp).clip(RoundedCornerShape(50.dp)).background(accent.copy(alpha = .78f)))
            Spacer(Modifier.width(10.dp))
            Surface(shape = RoundedCornerShape(13.dp), color = accent.copy(alpha = .13f)) { Icon(Icons.Default.School, null, tint = accent, modifier = Modifier.padding(10.dp).size(20.dp)) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text(repairText(school.name), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 2); Text(repairText(listOf(school.city, school.phone).filter(String::isNotBlank).joinToString(" · ").ifBlank { "Município não informado" }), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1) }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(5.dp)) { if (school.status.isNotBlank()) PainelStatusBadge(school.status); Icon(Icons.Default.ChevronRight, "Abrir escola", tint = Muted, modifier = Modifier.size(18.dp)) }
        }
    }
}

@Composable
private fun NativeSchoolDetail(school: School, role: String, data: PainelData, repository: PainelRepository, token: String, refresh: () -> Unit, back: () -> Unit) {
    val profile = data.schoolProfiles.firstOrNull { it.school.equals(school.name, true) }
    val editable = listOf("administrador", "gabinete", "seintec", "supervis", "seom", "dirigente").any { role.contains(it, true) }
    var city by remember(school.name) { mutableStateOf(school.city) }
    var cie by remember(school.name) { mutableStateOf(profile?.fields?.get("cie") ?: school.raw["cie"].orEmpty()) }
    var director by remember(school.name) { mutableStateOf(profile?.fields?.get("director").orEmpty()) }
    var viceDirector by remember(school.name) { mutableStateOf(profile?.fields?.get("viceDirector").orEmpty()) }
    var proati by remember(school.name) { mutableStateOf(profile?.fields?.get("proati").orEmpty()) }
    var goe by remember(school.name) { mutableStateOf(profile?.fields?.get("goe").orEmpty()) }
    var phone by remember(school.name) { mutableStateOf(profile?.fields?.get("phone") ?: school.phone) }
    var mobile by remember(school.name) { mutableStateOf(profile?.fields?.get("mobile").orEmpty()) }
    var email by remember(school.name) { mutableStateOf(profile?.fields?.get("email").orEmpty()) }
    var address by remember(school.name) { mutableStateOf(profile?.fields?.get("address").orEmpty()) }
    var notes by remember(school.name) { mutableStateOf(profile?.fields?.get("notes").orEmpty()) }
    var saving by remember { mutableStateOf(false) }
    var related by remember { mutableStateOf<PanelRecord?>(null) }
    val scope = rememberCoroutineScope()
    fun save() {
        saving = true
        val fields = JSONObject().put("city", city).put("cie", cie).put("director", director).put("viceDirector", viceDirector).put("proati", proati).put("goe", goe).put("phone", phone).put("mobile", mobile).put("email", email).put("address", address).put("notes", notes)
        val onlineWrite = role.contains("administrador", true)
        scope.launch { withContext(Dispatchers.IO) { repository.saveSchoolProfile(token, school.name, fields, data.updatedAt, onlineWrite) }; saving = false; refresh() }
    }
    val key = school.name.trim()
    val inventory = data.inventory.filter { it.school.equals(key, true) }
    val calls = data.calls.filter { it.subtitle.contains(key, true) || it.fields.values.any { value -> value.equals(key, true) } }
    val networks = data.networks.filter { it.title.contains(key, true) || it.subtitle.contains(key, true) }
    val supervisors = data.supervisors.filter { it.title.contains(key, true) || it.subtitle.contains(key, true) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 116.dp)) {
        item { ModuleBackHeader(back) }
        item { Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .10f))) { Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) { Text("ESCOLA", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold); Text(school.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold); Text(listOf(school.city, "CIE: $cie", school.phone, mobile).filter(String::isNotBlank).joinToString(" · "), color = Muted); if (school.status.isNotBlank()) PainelStatusBadge(school.status); Text("Perfil operacional · $role", color = Muted, style = MaterialTheme.typography.bodySmall) } } }
        if (editable) item { Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .10f))) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("CADASTRO", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        Text("Editar informações", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                    Icon(Icons.Default.Edit, "Editar", tint = Lime, modifier = Modifier.size(20.dp))
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = .12f))
                PainelFormField(city, { city = it }, "Cidade")
                PainelFormField(cie, { cie = it }, "CIE")
                PainelFormField(director, { director = it }, "Diretor(a)")
                PainelFormField(viceDirector, { viceDirector = it }, "Vice-diretor(a)")
                PainelFormField(proati, { proati = it }, "PROATI")
                PainelFormField(goe, { goe = it }, "GOE")
                PainelFormField(phone, { phone = it }, "Telefone")
                PainelFormField(mobile, { mobile = it }, "Celular")
                PainelFormField(email, { email = it }, "E-mail")
                PainelFormField(address, { address = it }, "Endereço")
                PainelFormField(notes, { notes = it }, "Observações", minLines = 3)
                Button(::save, enabled = !saving, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = BackgroundDark)) {
                    Icon(if (saving) Icons.Default.HourglassTop else Icons.Default.Save, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(if (saving) "Salvando..." else "Salvar cadastro")
                }
            }
        } }
        val aggregate = data.schoolInventoryMetrics.entries.firstOrNull { it.key.equals(key, true) }?.value.orEmpty()
        item { SchoolMetricsGrid(
            inventory.size.coerceAtLeast(aggregate["items"]?.toIntOrNull() ?: 0),
            inventory.any { it.status.contains("def", true) || it.status.contains("manut", true) } || (aggregate["alerts"]?.toIntOrNull() ?: 0) > 0,
            calls.size,
            calls.isNotEmpty(),
            networks.size,
            networks.isEmpty(),
            supervisors.size
        ) }
        item { SchoolSectionHeading(Icons.Default.Inventory2, "Inventário da escola", inventory.size) }
        if (inventory.isEmpty()) item { Text("Nenhum item vinculado.", color = Muted) }
        items(inventory.take(30), key = { it.id.ifBlank { "${it.school}:${it.name}:${it.serial}" } }) { item -> NativeRecordCard(PanelRecord(item.name, listOf(item.school, item.serial, item.patrimony).filter(String::isNotBlank).joinToString(" · "), item.status)) { related = PanelRecord(item.name, listOf(item.school, item.serial, item.patrimony).filter(String::isNotBlank).joinToString(" · "), item.status, mapOf("Escola" to item.school, "Série" to item.serial, "Patrimônio" to item.patrimony, "Responsável" to item.responsible, "Observações" to item.notes)) } }
        item { SchoolSectionHeading(Icons.Default.SupportAgent, "Chamados vinculados", calls.size) }
        if (calls.isEmpty()) item { Text("Nenhum chamado vinculado.", color = Muted) }
        items(calls.take(20), key = { "call:${it.title}:${it.subtitle}" }) { NativeRecordCard(it) { related = it } }
        item { SchoolSectionHeading(Icons.Default.Wifi, "Redes e câmeras vinculadas", networks.size) }
        if (networks.isEmpty()) item { Text("Nenhuma rede vinculada.", color = Muted) }
        items(networks.take(10), key = { "school-network:${it.title}:${it.subtitle}" }) { NativeRecordCard(it) { related = it } }
        item { SchoolSectionHeading(Icons.Default.Visibility, "Supervisão vinculada", supervisors.size) }
        if (supervisors.isEmpty()) item { Text("Nenhum registro de supervisão vinculado.", color = Muted) }
        items(supervisors.take(10), key = { "school-supervision:${it.title}:${it.subtitle}" }) { NativeRecordCard(it) { related = it } }
        if (school.raw.isNotEmpty()) item { Text("Dados cadastrais", style = MaterialTheme.typography.titleLarge) }
        items(school.raw.filter { it.value.isNotBlank() }.toList()) { (field, value) -> Text("$field: $value", color = Muted) }
    }
    related?.let { RecordDetailDialog("Detalhe relacionado · ${school.name}", it) { related = null } }
}

@Composable private fun SchoolMetricRowLegacy(label: String, count: Int, alert: Boolean) {
    val accent = if (alert) MaterialTheme.colorScheme.error else SuccessGreen
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .38f)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(7.dp).clip(RoundedCornerShape(50)).background(accent))
            Spacer(Modifier.width(9.dp))
            Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
            Text(count.toString(), color = accent, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.width(8.dp))
            Text(if (alert) "Atenção" else "OK", color = if (alert) MaterialTheme.colorScheme.error else Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SchoolMetricRow(label: String, count: Int, alert: Boolean, modifier: Modifier = Modifier) {
    val accent = if (alert) MaterialTheme.colorScheme.error else SuccessGreen
    Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(15.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(9.dp), color = accent.copy(alpha = .14f)) {
                Icon(if (alert) Icons.Default.WarningAmber else Icons.Default.CheckCircle, null, tint = accent, modifier = Modifier.padding(6.dp).size(15.dp))
            }
            Spacer(Modifier.width(9.dp))
            Text(repairText(label), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            Text(count.toString(), color = accent, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(8.dp))
            Text(if (alert) "Atenção" else "OK", color = if (alert) MaterialTheme.colorScheme.error else Muted, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SchoolSectionHeading(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, count: Int) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(10.dp), color = Lime.copy(alpha = .13f)) {
            Icon(icon, null, tint = Lime, modifier = Modifier.padding(7.dp).size(17.dp))
        }
        Spacer(Modifier.width(9.dp))
        Text(repairText(title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Surface(shape = RoundedCornerShape(50.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) {
            Text(count.toString(), color = Lime, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp))
        }
    }
}

@Composable
private fun SchoolMetricsGrid(inventory: Int, inventoryAlert: Boolean, calls: Int, callsAlert: Boolean, networks: Int, networksAlert: Boolean, supervision: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SchoolMetricRow("Inventário", inventory, inventoryAlert, Modifier.weight(1f))
            SchoolMetricRow("Chamados", calls, callsAlert, Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SchoolMetricRow("Redes/câmeras", networks, networksAlert, Modifier.weight(1f))
            SchoolMetricRow("Supervisão", supervision, false, Modifier.weight(1f))
        }
    }
}

@Composable
private fun NativeAccount(role: String, onTheme: () -> Unit, onLogout: () -> Unit, canAdmin: Boolean, admin: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("PAINELURE  /  PERFIL", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text("Sua conta", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Text("Preferências e nível de acesso", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .10f))) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(15.dp), color = Lime.copy(alpha = .14f)) {
                    Icon(Icons.Default.Person, "Perfil", tint = Lime, modifier = Modifier.padding(12.dp).size(24.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("Perfil ativo", color = Muted, style = MaterialTheme.typography.labelMedium)
                    Text(role.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Permissões controladas pelo PainelURE", color = Muted, style = MaterialTheme.typography.bodySmall)
                }
                PainelStatusBadge("ativo")
            }
        }
        Text("Preferências", color = Muted, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        FilledTonalButton(onTheme, Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), contentPadding = PaddingValues(vertical = 13.dp)) {
            Icon(Icons.Default.DarkMode, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Alternar tema")
        }
        if (canAdmin) FilledTonalButton(admin, Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), contentPadding = PaddingValues(vertical = 13.dp)) {
            Icon(Icons.Default.AdminPanelSettings, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Administração")
        }
        Spacer(Modifier.weight(1f))
        OutlinedButton(onLogout, Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
            Icon(Icons.Default.Logout, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Sair da conta")
        }
    }
}

@Composable private fun DashboardCardV2(data: PainelData) {
    val aggregateAlerts = data.schoolInventoryMetrics.values.sumOf { it["alerts"]?.toIntOrNull() ?: 0 }
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, PanelBorder)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Dados online", color = Lime, style = MaterialTheme.typography.labelLarge)
                    Text("Resumo operacional", color = Muted, style = MaterialTheme.typography.bodySmall)
                }
                Icon(Icons.Default.TrendingUp, "Atualizado", tint = SuccessGreen)
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(data.schools.size.toString(), color = Lime, style = MaterialTheme.typography.headlineLarge)
                    Text("escolas acompanhadas", color = Muted, style = MaterialTheme.typography.bodySmall)
                }
                PainelStatusBadge(if (aggregateAlerts > 0) "$aggregateAlerts alertas" else "base estável")
            }
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Metric(data.networks.size.toString(), "Redes", Modifier.width(92.dp))
                Metric(data.inventory.size.toString(), "Inventário", Modifier.width(92.dp))
                Metric(data.calls.size.toString(), "Chamados", Modifier.width(92.dp))
                Metric(data.cars.size.toString(), "Carros", Modifier.width(92.dp))
            }
            if (aggregateAlerts > 0) Text("Revise os itens sinalizados no inventário", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable private fun DashboardCard(data: PainelData) {
    val aggregateAlerts = data.schoolInventoryMetrics.values.sumOf { it["alerts"]?.toIntOrNull() ?: 0 }
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Dados online", color = Lime, style = MaterialTheme.typography.labelLarge); Text("Resumo operacional", color = Muted, style = MaterialTheme.typography.bodySmall) }
                Icon(Icons.Default.TrendingUp, "Atualizado", tint = SuccessGreen)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { Metric("${data.schools.size}", "Escolas", Modifier.weight(1f)); Metric("${data.networks.size}", "Redes", Modifier.weight(1f)); Metric("${data.inventory.size}", "Inventário", Modifier.weight(1f)) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { Metric("${data.calls.size}", "Chamados", Modifier.weight(1f)); Metric("${data.cars.size}", "Carros", Modifier.weight(1f)); Metric("${data.calendar.size}", "Agenda", Modifier.weight(1f)) }
            if (aggregateAlerts > 0) Text("$aggregateAlerts alerta(s) no inventário", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}
@Composable private fun Metric(value: String, label: String, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)) {
        Column(Modifier.padding(horizontal = 10.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(value, style = MaterialTheme.typography.titleLarge, color = Lime, fontWeight = FontWeight.Bold)
            Text(label, color = Muted, style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
}
@Composable private fun SummaryStrip(metrics: List<Pair<String, String>>, alert: Boolean = false) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = if (alert) MaterialTheme.colorScheme.errorContainer.copy(alpha = .48f) else PanelSurface),
        border = BorderStroke(1.dp, PanelBorder)
    ) {
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            metrics.forEach { (value, label) ->
                val metricModifier = Modifier.width(if (metrics.size <= 4) 104.dp else 112.dp)
                Metric(value, label, metricModifier)
            }
        }
    }
}
@Composable private fun ModuleCardV2(module: PanelModule, count: Int, modifier: Modifier = Modifier, open: () -> Unit) {
    val enabled = module.state != PanelModuleState.PLANNED
    val accent = when (module.state) { PanelModuleState.AVAILABLE -> SuccessGreen; PanelModuleState.READ_ONLY -> AccentBlue; PanelModuleState.PLANNED -> WarningOrange }
    Card(modifier.fillMaxWidth().heightIn(min = 142.dp).clickable(enabled = enabled, onClick = open), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .42f)), border = BorderStroke(1.dp, accent.copy(alpha = .20f))) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(13.dp), color = accent.copy(alpha = .14f)) { Icon(moduleIcon(module.key), null, tint = accent, modifier = Modifier.padding(9.dp).size(19.dp)) }
                Spacer(Modifier.width(9.dp))
                PainelStatusBadge(moduleAvailabilityLabel(module.state))
                Spacer(Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, "Abrir", tint = Muted, modifier = Modifier.size(18.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(module.label, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(count.toString(), color = accent, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("itens", color = Muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(bottom = 3.dp))
                }
                Text(modulePurpose(module.key), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1)
            }
        }
    }
}

@Composable
private fun ModuleListCard(module: PanelModule, count: Int, open: () -> Unit) {
    val enabled = module.state != PanelModuleState.PLANNED
    val accent = when (module.state) { PanelModuleState.AVAILABLE -> SuccessGreen; PanelModuleState.READ_ONLY -> AccentBlue; PanelModuleState.PLANNED -> WarningOrange }
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = open),
        shape = RoundedCornerShape(17.dp),
        color = PanelSurface,
        border = BorderStroke(1.dp, PanelBorder)
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).height(43.dp).clip(RoundedCornerShape(50.dp)).background(accent.copy(alpha = .78f)))
            Spacer(Modifier.width(10.dp))
            Surface(shape = RoundedCornerShape(13.dp), color = accent.copy(alpha = .13f)) {
                Icon(moduleIcon(module.key), null, tint = accent, modifier = Modifier.padding(10.dp).size(21.dp))
            }
            Column(Modifier.weight(1f).padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(repairText(module.label), style = MaterialTheme.typography.titleMedium, maxLines = 1)
            Text(repairText(modulePurpose(module.key)), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Surface(shape = RoundedCornerShape(9.dp), color = accent.copy(alpha = .11f)) {
                    Text(count.toString(), color = accent, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
                Text(repairText(moduleAvailabilityLabel(module.state)), color = Muted, style = MaterialTheme.typography.labelSmall)
            }
            Spacer(Modifier.width(7.dp))
            Icon(Icons.Default.ChevronRight, "Abrir", tint = Muted, modifier = Modifier.size(19.dp))
        }
    }
}

@Composable private fun ModuleCard(module: PanelModule, count: Int, open: () -> Unit) {
    val enabled = module.state != PanelModuleState.PLANNED
    Card(Modifier.fillMaxWidth().heightIn(min = 142.dp).clickable(enabled = enabled, onClick = open), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .48f)), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .12f))) {
        Row(Modifier.fillMaxWidth()) {
            Box(Modifier.width(3.dp).fillMaxHeight().background(if (enabled) SuccessGreen.copy(alpha = .72f) else WarningOrange.copy(alpha = .72f)))
            Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(11.dp), color = Lime.copy(alpha = .14f)) { Icon(moduleIcon(module.key), null, tint = Lime, modifier = Modifier.padding(8.dp).size(18.dp)) }
                    Spacer(Modifier.width(9.dp)); Text(module.label, style = MaterialTheme.typography.labelLarge, maxLines = 2, modifier = Modifier.weight(1f)); PainelStatusBadge(moduleAvailabilityLabel(module.state))
                }
                Text(count.toString(), color = Lime, style = MaterialTheme.typography.headlineSmall)
                Text(modulePurpose(module.key), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 1)
            }
        }
    }
}
private fun moduleIcon(key: String) = when (key) {
    "schools" -> Icons.Default.School
    "inventory", "bi-equipment" -> Icons.Default.Inventory2
    "calls", "ctc" -> Icons.Default.SupportAgent
    "cars" -> Icons.Default.DirectionsCar
    "calendar", "rede-2026" -> Icons.Default.Event
    "network" -> Icons.Default.Wifi
    "contacts" -> Icons.Default.Contacts
    "supervision" -> Icons.Default.Visibility
    "satisfaction" -> Icons.Default.ThumbUp
    "reports" -> Icons.Default.Assessment
    else -> Icons.Default.Apps
}

private fun moduleAvailabilityLabel(state: PanelModuleState) = when (state) {
    PanelModuleState.AVAILABLE -> "disponível"
    PanelModuleState.READ_ONLY -> "consulta"
    PanelModuleState.PLANNED -> "em migração"
}

private fun modulePurpose(key: String) = when (key) {
    "schools" -> "Cadastros e acompanhamento escolar"
    "network" -> "Redes, câmeras e infraestrutura"
    "inventory", "bi-equipment" -> "Equipamentos e patrimônio"
    "supervision" -> "Visitas e acompanhamento"
    "contacts" -> "Contatos e setores da URE"
    "calls", "ctc" -> "Chamados e visitas técnicas"
    "cars" -> "Reservas e deslocamentos"
    "calendar", "rede-2026" -> "Agenda e compromissos"
    "satisfaction" -> "Respostas e indicadores"
    "reports" -> "Relatórios e consolidados"
    "admin" -> "Usuários, regras e auditoria"
    "internal" -> "Ferramentas internas"
    "profiles" -> "Perfis e permissões"
    "quality" -> "Consistência dos dados"
    else -> "Dados operacionais do painel"
}
@Composable private fun NativeRecordCardLegacy(record: PanelRecord, open: () -> Unit) {
    val hasStatus = record.status.isNotBlank()
    val statusColor = if (hasStatus) statusAccent(record.status) else MaterialTheme.colorScheme.outline
    Card(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, statusColor.copy(alpha = if (hasStatus) .24f else .10f))) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(4.dp).height(48.dp).clip(RoundedCornerShape(4.dp)).background(statusColor.copy(alpha = if (hasStatus) .80f else .32f)))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(record.title, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                if (record.subtitle.isNotBlank()) Text(record.subtitle, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2)
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (hasStatus) PainelStatusBadge(record.status)
                Icon(Icons.Default.ChevronRight, "Abrir", tint = Muted, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun NativeRecordCard(record: PanelRecord, open: () -> Unit) {
    val hasStatus = record.status.isNotBlank()
    val accent = if (hasStatus) statusAccent(record.status) else AccentBlue
    val initial = record.title.trim().firstOrNull()?.uppercase() ?: "•"
    Surface(Modifier.fillMaxWidth().clickable(onClick = open), shape = RoundedCornerShape(19.dp), color = PanelGlass, border = BorderStroke(1.dp, accent.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).height(58.dp).clip(RoundedCornerShape(50.dp)).background(accent.copy(alpha = .78f)))
            Spacer(Modifier.width(10.dp))
            Surface(shape = RoundedCornerShape(14.dp), color = accent.copy(alpha = .14f)) {
                Text(initial, color = accent, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 13.dp, vertical = 11.dp))
            }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(repairText(record.title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 2)
                Text(repairText(record.subtitle).ifBlank { "Registro operacional" }, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.width(7.dp))
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(5.dp)) {
                if (hasStatus) PainelStatusBadge(record.status)
                Icon(Icons.Default.ChevronRight, "Abrir", tint = Muted, modifier = Modifier.size(18.dp))
            }
        }
    }
}

private fun statusAccent(status: String): Color {
    val normalized = status.lowercase()
    return when {
        normalized.contains("erro") || normalized.contains("def") || normalized.contains("atras") || normalized.contains("crit") -> DangerRed
        normalized.contains("pend") || normalized.contains("aten") || normalized.contains("manut") -> WarningOrange
        normalized.contains("ok") || normalized.contains("resolv") || normalized.contains("concl") || normalized.contains("ativo") -> SuccessGreen
        else -> AccentBlue
    }
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun RecordDetailDialog(title: String, record: PanelRecord, close: () -> Unit) {
    val context = LocalContext.current
    val link = record.fields.entries.firstOrNull { (key, value) ->
        key.contains("link", true) || key.contains("url", true) && value.startsWith("http", true)
    }?.value?.takeIf { it.startsWith("http", true) }
    ModalBottomSheet(onDismissRequest = close, shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp), containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.align(Alignment.CenterHorizontally).width(38.dp).height(4.dp).clip(RoundedCornerShape(50.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = .18f)))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(repairText(title), color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text("Detalhes do registro", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = close) { Text("Fechar") }
            }
            LazyColumn(Modifier.heightIn(max = 520.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                item { Text(repairText(record.title), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold) }
                if (record.subtitle.isNotBlank()) item { Text(repairText(record.subtitle), color = Muted) }
                if (record.status.isNotBlank()) item { PainelStatusBadge(record.status) }
                items(record.fields.filter { it.value.isNotBlank() && it.key !in setOf("title", "name", "label", "value") }.toList()) { (key, value) ->
                    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) {
                        Column(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(repairText(key), color = Muted, style = MaterialTheme.typography.labelSmall)
                            Text(repairText(value), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
            if (link != null) FilledTonalButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link))) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                Icon(Icons.Default.OpenInNew, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(7.dp)); Text("Abrir link")
            }
        }
    }
}
@Composable private fun NoticeCard(text: String, retry: () -> Unit, offline: Boolean = false) {
    val accent = if (offline) WarningOrange else MaterialTheme.colorScheme.error
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = accent.copy(alpha = .10f)), border = BorderStroke(1.dp, accent.copy(alpha = .22f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(11.dp), color = accent.copy(alpha = .14f)) { Icon(if (offline) Icons.Default.CloudOff else Icons.Default.ErrorOutline, null, tint = accent, modifier = Modifier.padding(8.dp).size(18.dp)) }
            Spacer(Modifier.width(10.dp))
            Text(text, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
            TextButton(retry, colors = ButtonDefaults.textButtonColors(contentColor = accent)) { Text("Tentar") }
        }
    }
}
@Composable private fun LoadingCard() {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .46f))) {
        Column(Modifier.padding(horizontal = 15.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Lime); Spacer(Modifier.width(10.dp)); Column { Text("Sincronizando dados", style = MaterialTheme.typography.titleSmall); Text("Atualizando o painel com o estado online", style = MaterialTheme.typography.bodySmall, color = Muted) } }
            LinearProgressIndicator(Modifier.fillMaxWidth(), color = Lime.copy(alpha = .78f), trackColor = MaterialTheme.colorScheme.outline.copy(alpha = .14f))
        }
    }
}
@Composable private fun EmptyModuleLegacy(module: PanelModule) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .42f))) {
        Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Surface(shape = RoundedCornerShape(15.dp), color = Lime.copy(alpha = .12f)) { Icon(Icons.Default.Inbox, null, tint = Lime, modifier = Modifier.padding(11.dp).size(24.dp)) }
            Text("Nenhum dado disponível", style = MaterialTheme.typography.titleMedium)
            Text("${module.label} está acessível, mas não há registros para este perfil.", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun EmptyModule(module: PanelModule) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), color = PanelSubtle, border = BorderStroke(1.dp, PanelBorder)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 26.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Surface(shape = RoundedCornerShape(18.dp), color = Lime.copy(alpha = .14f)) {
                Icon(moduleIcon(module.key), "Módulo vazio", tint = Lime, modifier = Modifier.padding(13.dp).size(26.dp))
            }
            Text("Nada por aqui ainda", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("${module.label} está disponível, mas não há registros para este perfil.", color = Muted, style = MaterialTheme.typography.bodySmall, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}

private fun csvCell(value: String): String = "\"${value.replace("\"", "\"\"")}\""

private fun countFor(key: String, d: PainelData) = recordsFor(key, d).size
private fun recordsFor(key: String, d: PainelData): List<PanelRecord> = when (key) {
    "schools" -> d.schools.map { PanelRecord(it.name, listOf(it.city, it.phone).filter(String::isNotBlank).joinToString(" · "), it.status) }
    "network" -> d.networks
    "inventory" -> d.inventory.map { PanelRecord(it.name, listOf(it.school, it.serial, it.patrimony).filter(String::isNotBlank).joinToString(" · "), it.status) }
    "supervision" -> d.supervisors
    "contacts" -> d.contacts
    "calls", "ctc" -> d.calls
    "cars" -> d.cars
    "calendar" -> d.calendar
    "rede-2026" -> d.rede2026
    "satisfaction" -> d.satisfaction
    "reports" -> d.reports
    "bi-equipment" -> d.inventory.map { PanelRecord(it.name, listOf(it.school, it.serial, it.patrimony).filter(String::isNotBlank).joinToString(" · "), it.status) }
    "internal" -> d.internal
    "profiles" -> d.profiles
    "quality" -> d.quality
    else -> emptyList()
}

@Composable
private fun AccountActionCard(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, onClick: () -> Unit, accent: Color = Lime) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .42f)), border = BorderStroke(1.dp, accent.copy(alpha = .18f))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(12.dp), color = accent.copy(alpha = .14f)) { Icon(icon, null, tint = accent, modifier = Modifier.padding(9.dp).size(19.dp)) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) { Text(title, style = MaterialTheme.typography.titleMedium); Text(subtitle, color = Muted, style = MaterialTheme.typography.bodySmall) }
            Icon(Icons.Default.ChevronRight, "Abrir", tint = Muted, modifier = Modifier.size(18.dp))
        }
    }
}

private data class AccountAction(
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val title: String,
    val subtitle: String,
    val accent: Color,
    val onClick: () -> Unit
)

@Composable
private fun AccountActionGroup(title: String, actions: List<AccountAction>) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = PanelGlass,
        border = BorderStroke(1.dp, PanelBorder)
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp)) {
            Text(repairText(title), color = Muted, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 2.dp, vertical = 7.dp))
            actions.forEachIndexed { index, action ->
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable(onClick = action.onClick).padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(shape = RoundedCornerShape(11.dp), color = action.accent.copy(alpha = .14f)) {
                        Icon(action.icon, null, tint = action.accent, modifier = Modifier.padding(9.dp).size(19.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(repairText(action.title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(repairText(action.subtitle), color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    Icon(Icons.Default.ChevronRight, "Abrir", tint = Muted, modifier = Modifier.size(18.dp))
                }
                if (index < actions.lastIndex) HorizontalDivider(color = PanelBorder, modifier = Modifier.padding(start = 53.dp))
            }
        }
    }
}

@Composable
private fun NativeAccountWithProfileV2(name: String, avatar: String, role: String, repository: PainelRepository, token: String, onTheme: () -> Unit, onLogout: () -> Unit, canAdmin: Boolean, admin: () -> Unit) {
    var profileOpen by remember { mutableStateOf(false) }
    var displayName by remember(name) { mutableStateOf(name) }
    var displayAvatar by remember(avatar) { mutableStateOf(avatar) }
    val avatarImage = remember(displayAvatar) { decodeAvatar(displayAvatar) }
    val accountShape = RoundedCornerShape(26.dp)
    val accountBrush = Brush.linearGradient(listOf(HeroCard, Color(0xFF19251F), Color(0xFF28331D)))
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(top = 18.dp, bottom = 110.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("CONTA", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                Text("Seu espaço", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Identidade, preferências e acesso ao painel", color = Muted, style = MaterialTheme.typography.bodySmall)
            }
        }
        item {
            Card(Modifier.fillMaxWidth().clip(accountShape).background(accountBrush), shape = accountShape, colors = CardDefaults.cardColors(containerColor = Color.Transparent), border = BorderStroke(1.dp, Lime.copy(alpha = .28f))) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(50.dp), color = Lime.copy(alpha = .16f)) {
                            if (avatarImage != null) Image(avatarImage, contentDescription = "Foto de perfil", modifier = Modifier.size(62.dp).clip(RoundedCornerShape(50.dp)))
                            else Text(displayName.trim().firstOrNull()?.uppercase() ?: "U", color = Lime, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(horizontal = 17.dp, vertical = 15.dp))
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(displayName.ifBlank { "Usuário autenticado" }, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 2)
                            Text("Acesso PainelURE", color = HeroCardSecondaryText, style = MaterialTheme.typography.bodySmall)
                        }
                        Icon(Icons.Default.VerifiedUser, "Conta autenticada", tint = SuccessGreen, modifier = Modifier.size(21.dp))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AccountIdentityPill("PERFIL", role, Lime, Modifier.weight(1f))
                        AccountIdentityPill("STATUS", "ATIVO", SuccessGreen, Modifier.weight(1f))
                    }
                }
            }
        }
        item { AccountActionGroup("Preferências e segurança", buildList {
            add(AccountAction(Icons.Default.Edit, "Editar meu perfil", "Nome, foto e PIN de acesso", Lime) { profileOpen = true })
            add(AccountAction(Icons.Default.DarkMode, "Alternar tema", "Escolha a aparência mais confortável", AccentBlue, onTheme))
            if (canAdmin) add(AccountAction(Icons.Default.AdminPanelSettings, "Administração", "Usuários, permissões e auditoria", AccentPurple, admin))
        }) }
        item { AccountActionGroup("Sessão", listOf(AccountAction(Icons.Default.Logout, "Sair da conta", "Encerrar a sessão neste aparelho", MaterialTheme.colorScheme.error, onLogout))) }
    }
    if (profileOpen) NativeProfileDialog(repository, token, displayName, displayAvatar, { profileOpen = false }) { updated -> displayName = updated.name; displayAvatar = updated.avatar; profileOpen = false }
}

@Composable
private fun AccountIdentityPill(label: String, value: String, accent: Color, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(14.dp), color = Color.White.copy(alpha = .07f)) {
        Column(Modifier.padding(horizontal = 11.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, color = HeroCardSecondaryText, style = MaterialTheme.typography.labelSmall)
            Text(value.replaceFirstChar { it.uppercase() }, color = accent, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
}

@Composable
private fun NativeAccountWithProfile(name: String, avatar: String, role: String, repository: PainelRepository, token: String, onTheme: () -> Unit, onLogout: () -> Unit, canAdmin: Boolean, admin: () -> Unit) {
    var profileOpen by remember { mutableStateOf(false) }
    var displayName by remember(name) { mutableStateOf(name) }
    var displayAvatar by remember(avatar) { mutableStateOf(avatar) }
    val avatarImage = remember(displayAvatar) { decodeAvatar(displayAvatar) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 22.dp, bottom = 110.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("PAINELURE  /  CONTA", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                Text("Conta", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Preferências e acesso", color = Muted, style = MaterialTheme.typography.bodySmall)
            }
        }
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = PanelSurface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .14f))) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(50.dp), color = Lime.copy(alpha = .16f)) {
                        if (avatarImage != null) Image(avatarImage, contentDescription = "Foto de perfil", modifier = Modifier.size(58.dp).clip(RoundedCornerShape(50.dp)))
                        else Text(displayName.trim().firstOrNull()?.uppercase() ?: "U", color = Lime, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(horizontal = 16.dp, vertical = 13.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { Text(displayName.ifBlank { "Usuário autenticado" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold); PainelStatusBadge(role); Text(if (displayAvatar.isBlank()) "Sem foto de perfil" else "Foto de perfil configurada", color = Muted, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
        item { Text("Configurações", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 4.dp)) }
        item { AccountActionCard(Icons.Default.Edit, "Editar meu perfil", "Nome, foto e informações pessoais", { profileOpen = true }) }
        item { AccountActionCard(Icons.Default.DarkMode, "Alternar tema", "Ajuste a aparência do painel", onTheme) }
        if (canAdmin) item { AccountActionCard(Icons.Default.AdminPanelSettings, "Administração", "Usuários, permissões e auditoria", admin, accent = AccentPurple) }
        item { Spacer(Modifier.height(8.dp)) }
        item { AccountActionCard(Icons.Default.Logout, "Sair da conta", "Encerrar a sessão neste aparelho", onLogout, accent = MaterialTheme.colorScheme.error) }
    }
    if (profileOpen) NativeProfileDialog(repository, token, displayName, displayAvatar, { profileOpen = false }) { updated -> displayName = updated.name; displayAvatar = updated.avatar; profileOpen = false }
}

private fun decodeAvatar(value: String): androidx.compose.ui.graphics.ImageBitmap? {
    if (!value.startsWith("data:image", true)) return null
    val encoded = value.substringAfter(",", "")
    return runCatching { BitmapFactory.decodeByteArray(Base64.decode(encoded, Base64.DEFAULT), 0, Base64.decode(encoded, Base64.DEFAULT).size)?.asImageBitmap() }.getOrNull()
}

@Composable
private fun NativeProfileDialog(repository: PainelRepository, token: String, currentName: String, currentAvatar: String, close: () -> Unit, onSaved: (PainelUser) -> Unit) {
    var name by remember(currentName) { mutableStateOf(currentName) }
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var avatar by remember(currentAvatar) { mutableStateOf(currentAvatar) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            val bytes = runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
            if (bytes == null || bytes.size > 2_000_000) message = "Escolha uma imagem de até 2 MB."
            else avatar = "data:${context.contentResolver.getType(uri) ?: "image/jpeg"};base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
        }
    }
    ModalBottomSheet(onDismissRequest = close, shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp), containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("PAINELURE  /  CONTA", color = Lime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text("Meu perfil", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = close, enabled = !busy) { Text("Fechar") }
            }
            Column(Modifier.heightIn(max = 500.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Informações básicas", style = MaterialTheme.typography.titleMedium)
                OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("Nome") }, singleLine = true, shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, cursorColor = Lime))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    FilledTonalButton({ picker.launch("image/*") }, enabled = !busy, shape = RoundedCornerShape(13.dp), modifier = Modifier.weight(1f)) { Icon(Icons.Default.AddAPhoto, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(6.dp)); Text("Escolher foto") }
                    TextButton({ avatar = "" }, enabled = !busy && avatar.isNotBlank()) { Text("Remover") }
                }
                Text("Segurança", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp))
                OutlinedTextField(pin, { pin = it }, Modifier.fillMaxWidth(), label = { Text("Novo PIN (opcional)") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, cursorColor = Lime))
                if (pin.isNotBlank()) OutlinedTextField(confirmPin, { confirmPin = it }, Modifier.fillMaxWidth(), label = { Text("Confirmar PIN") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Lime, focusedLabelColor = Lime, cursorColor = Lime))
                if (message.isNotBlank()) Text(message, color = if (message == "Perfil atualizado.") SuccessGreen else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            Button(enabled = !busy && name.isNotBlank(), onClick = {
                if (pin.isNotBlank() && (pin.length < 4 || pin != confirmPin)) message = "O PIN deve ter pelo menos 4 caracteres e coincidir."
                else {
                    busy = true
                    scope.launch {
                        val payload = JSONObject().put("name", name.trim()).put("avatar", avatar)
                        if (pin.isNotBlank()) payload.put("password", pin).put("preferences", JSONObject().put("forcePinChange", false))
                        val result = withContext(Dispatchers.IO) { repository.updateMyProfile(token, payload) }
                        busy = false
                        result.fold({ updated -> message = "Perfil atualizado."; onSaved(updated) }, { message = it.message ?: "Não foi possível atualizar." })
                    }
                }
            }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = BackgroundDark)) { if (busy) CircularProgressIndicator(Modifier.size(19.dp), strokeWidth = 2.dp) else Text("Salvar alterações") }
        }
    }
}
