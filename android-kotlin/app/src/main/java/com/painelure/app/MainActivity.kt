package com.painelure.app

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import com.painelure.app.ui.theme.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val API_BASE = "https://painelure2-api.onrender.com"
data class PanelData(val schoolNames: List<String> = emptyList(), val calendarItems: List<String> = emptyList(), val networkNames: List<String> = emptyList(), val inventoryCount: Int = 0, val supervisionCount: Int = 0, val contactsCount: Int = 0, val carsCount: Int = 0) {
    val schools get() = schoolNames.size
    val calendar get() = calendarItems.size
    val networks get() = networkNames.size
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { PainelUREApp(this) } }
}

@Composable private fun PainelUREApp(context: Context) {
    var token by remember { mutableStateOf(context.getSharedPreferences("painelure", 0).getString("token", "") ?: "") }
    var darkTheme by remember { mutableStateOf(context.getSharedPreferences("painelure", 0).getBoolean("dark", true)) }
    PainelURETheme(darkTheme) {
        if (token.isBlank()) LoginScreen({ user, pass, done -> Thread { val r = Api.login(user, pass); Handler(Looper.getMainLooper()).post { done(r?.optString("token").orEmpty(), r?.optString("error").orEmpty()) } }.start() }, { value -> context.getSharedPreferences("painelure", 0).edit().putString("token", value).apply(); token = value })
        else MainScreen(token, { context.getSharedPreferences("painelure", 0).edit().remove("token").apply(); token = "" }, { darkTheme = !darkTheme; context.getSharedPreferences("painelure", 0).edit().putBoolean("dark", darkTheme).apply() })
    }
}

@Composable private fun LoginScreen(onLogin: (String, String, (String, String) -> Unit) -> Unit, onSuccess: (String) -> Unit) {
    var user by remember { mutableStateOf("") }; var pass by remember { mutableStateOf("") }; var busy by remember { mutableStateOf(false) }; var error by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelLarge); Text("A URE na palma da mão.", style = MaterialTheme.typography.headlineLarge); Text("Acesse o painel operacional", color = Muted); Spacer(Modifier.height(28.dp))
        OutlinedTextField(user, { user = it }, Modifier.fillMaxWidth(), label = { Text("Usuário") }, singleLine = true); Spacer(Modifier.height(12.dp)); OutlinedTextField(pass, { pass = it }, Modifier.fillMaxWidth(), label = { Text("Senha") }, singleLine = true, visualTransformation = PasswordVisualTransformation()); if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(20.dp)); Button(onClick = { busy = true; onLogin(user, pass) { t, e -> busy = false; if (t.isNotBlank()) onSuccess(t) else error = e.ifBlank { "Não foi possível entrar." } } }, Modifier.fillMaxWidth(), enabled = !busy && user.isNotBlank() && pass.isNotBlank(), shape = RoundedCornerShape(16.dp)) { if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Entrar") }
    }
}

@Composable private fun MainScreen(token: String, onLogout: () -> Unit, onToggleTheme: () -> Unit) {
    var tab by remember { mutableStateOf(0) }; var query by remember { mutableStateOf("") }; var data by remember { mutableStateOf(PanelData()) }; var loading by remember { mutableStateOf(true) }; val labels = listOf("Painel", "Escolas", "Redes", "Agenda", "Mais"); val isWide = LocalConfiguration.current.screenWidthDp >= 600
    LaunchedEffect(token) { val a = withContext(Dispatchers.IO) { Api.data(token) }; val d = a?.optJSONObject("appData"); data = PanelData(Api.names(d?.optJSONArray("schools"), "name", "school", "nome"), Api.names(d?.optJSONArray("calendar"), "label", "title", "evento"), d?.optJSONObject("networkData")?.keys()?.asSequence()?.toList() ?: emptyList(), d?.optJSONArray("inventory")?.length() ?: d?.optJSONArray("schoolAssets")?.length() ?: 0, d?.optJSONArray("supervisors")?.length() ?: 0, d?.optJSONArray("contacts")?.length() ?: 0, d?.optJSONArray("cars")?.length() ?: 0); loading = false }
    Scaffold(bottomBar = { if (!isWide) NavigationBar(containerColor = PanelSurface) { labels.forEachIndexed { i, l -> NavigationBarItem(tab == i, { tab = i }, icon = { Icon(if (i == 0) Icons.Default.Home else if (i == 1) Icons.Default.School else if (i == 2) Icons.Default.Public else if (i == 3) Icons.Default.Event else Icons.Default.Menu, l) }, label = { Text(l) }) } } }) { p -> LazyColumn(Modifier.fillMaxSize().padding(p).padding(horizontal = if (isWide) 48.dp else 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(top = 28.dp, bottom = 28.dp)) {
        if (isWide) item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) { labels.forEachIndexed { i, l -> TextButton(onClick = { tab = i }) { Text(l, color = if (tab == i) Lime else Muted) } } } }
        item { Text("PAINELURE", style = MaterialTheme.typography.labelLarge, color = Lime); Text(if (tab == 0) "Visão geral" else labels[tab], style = MaterialTheme.typography.headlineLarge); Text("Dados oficiais do PainelURE", color = Muted) }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (tab == 0) { item { HeroCard(data) }; item { Text("Acesso rápido", style = MaterialTheme.typography.titleLarge) }; items(listOf("Escolas", "Redes e câmeras", "Inventário", "Supervisão")) { QuickCard(it) } }
        else if (tab == 4) { item { OutlinedButton(onClick = onToggleTheme) { Text("Alternar tema") } }; item { Button(onClick = onLogout) { Text("Sair da conta") } } }
        else { val rows = if (tab == 1) data.schoolNames else if (tab == 2) data.networkNames else data.calendarItems; val filtered = rows.filter { it.contains(query, ignoreCase = true) }; item { OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), label = { Text("Buscar ${labels[tab].lowercase()}") }, singleLine = true, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search)) }; item { Text("${filtered.size} registro(s) exibido(s)", color = Muted) }; items(filtered.take(50)) { QuickCard(it) } }
    } }
}

@Composable private fun HeroCard(d: PanelData) { Card(colors = CardDefaults.cardColors(containerColor = PanelSurface), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(22.dp)) { Text("DADOS ONLINE", color = Mint, style = MaterialTheme.typography.labelMedium); Text("Tudo sob controle.", style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.height(16.dp)); Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.fillMaxWidth()) { Metric(d.schools.toString(), "Escolas"); Metric(d.networks.toString(), "Redes"); Metric(d.inventoryCount.toString(), "Inventário"); Metric(d.calendar.toString(), "Agenda") } } } }
@Composable private fun Metric(v: String, l: String) { Column { Text(v, style = MaterialTheme.typography.titleLarge, color = Lime); Text(l, color = Muted, style = MaterialTheme.typography.bodySmall) } }
@Composable private fun QuickCard(s: String) { Card(colors = CardDefaults.cardColors(containerColor = PanelSurface), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) { Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.ChevronRight, null, tint = Lime); Spacer(Modifier.width(12.dp)); Text(s, style = MaterialTheme.typography.titleMedium); Spacer(Modifier.weight(1f)); Text("Consultar", color = Muted, style = MaterialTheme.typography.bodySmall) } } }

private object Api {
    private fun request(path: String, method: String, body: String? = null, token: String = ""): JSONObject? = try { val c = URL(API_BASE + path).openConnection() as HttpURLConnection; c.requestMethod = method; c.connectTimeout = 15000; c.readTimeout = 30000; c.setRequestProperty("Content-Type", "application/json"); if (token.isNotBlank()) c.setRequestProperty("Authorization", "Bearer $token"); if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }; val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream; JSONObject(stream.bufferedReader().use { it.readText() }) } catch (_: Exception) { null }
    fun login(user: String, pass: String) = request("/api/auth/login", "POST", JSONObject().put("username", user).put("password", pass).toString())
    fun data(token: String) = request("/api/data", "GET", token = token)?.optJSONObject("data")
    fun names(array: org.json.JSONArray?, vararg fields: String): List<String> = if (array == null) emptyList() else (0 until array.length()).mapNotNull { i -> val item = array.opt(i); when (item) { is JSONObject -> fields.firstNotNullOfOrNull { key -> item.optString(key).takeIf { it.isNotBlank() } }; else -> item?.toString() } }.filter { it.isNotBlank() }
}
