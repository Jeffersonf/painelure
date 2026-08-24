package com.painelure.app

import android.content.Context
import android.os.Bundle
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
import com.painelure.app.ui.theme.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val API_BASE = "https://painelure2-api.onrender.com"
data class PanelData(val schools: Int = 0, val calendar: Int = 0, val networks: Int = 0)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { PainelURETheme { PainelUREApp(this) } } }
}

@Composable private fun PainelUREApp(context: Context) {
    var token by remember { mutableStateOf(context.getSharedPreferences("painelure", 0).getString("token", "") ?: "") }
    if (token.isBlank()) LoginScreen({ user, pass, done -> Thread { val r = Api.login(user, pass); done(r?.optString("token").orEmpty(), r?.optString("error").orEmpty()) }.start() }, { value -> context.getSharedPreferences("painelure", 0).edit().putString("token", value).apply(); token = value })
    else MainScreen(token) { context.getSharedPreferences("painelure", 0).edit().remove("token").apply(); token = "" }
}

@Composable private fun LoginScreen(onLogin: (String, String, (String, String) -> Unit) -> Unit, onSuccess: (String) -> Unit) {
    var user by remember { mutableStateOf("") }; var pass by remember { mutableStateOf("") }; var busy by remember { mutableStateOf(false) }; var error by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("PAINELURE", color = Lime, style = MaterialTheme.typography.labelLarge); Text("A URE na palma da mão.", style = MaterialTheme.typography.headlineLarge); Text("Acesse o painel operacional", color = Muted); Spacer(Modifier.height(28.dp))
        OutlinedTextField(user, { user = it }, Modifier.fillMaxWidth(), label = { Text("Usuário") }, singleLine = true); Spacer(Modifier.height(12.dp)); OutlinedTextField(pass, { pass = it }, Modifier.fillMaxWidth(), label = { Text("Senha") }, singleLine = true, visualTransformation = PasswordVisualTransformation()); if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(20.dp)); Button(onClick = { busy = true; onLogin(user, pass) { t, e -> busy = false; if (t.isNotBlank()) onSuccess(t) else error = e.ifBlank { "Não foi possível entrar." } } }, Modifier.fillMaxWidth(), enabled = !busy && user.isNotBlank() && pass.isNotBlank(), shape = RoundedCornerShape(16.dp)) { if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Entrar") }
    }
}

@Composable private fun MainScreen(token: String, onLogout: () -> Unit) {
    var tab by remember { mutableStateOf(0) }; var data by remember { mutableStateOf(PanelData()) }; var loading by remember { mutableStateOf(true) }; val labels = listOf("Painel", "Escolas", "Redes", "Agenda", "Mais")
    LaunchedEffect(token) { Thread { val a = Api.data(token); val d = a?.optJSONObject("appData"); data = PanelData(d?.optJSONArray("schools")?.length() ?: 0, d?.optJSONArray("calendar")?.length() ?: 0, d?.optJSONObject("networkData")?.length() ?: 0); loading = false }.start() }
    Scaffold(bottomBar = { NavigationBar(containerColor = Surface) { labels.forEachIndexed { i, l -> NavigationBarItem(tab == i, { tab = i }, icon = { Icon(if (i == 0) Icons.Default.Home else if (i == 1) Icons.Default.School else if (i == 2) Icons.Default.Public else if (i == 3) Icons.Default.Event else Icons.Default.Menu, l) }, label = { Text(l) }) } } }) { p -> LazyColumn(Modifier.fillMaxSize().padding(p).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(top = 28.dp, bottom = 28.dp)) {
        item { Text("PAINELURE", style = MaterialTheme.typography.labelLarge, color = Lime); Text(if (tab == 0) "Visão geral" else labels[tab], style = MaterialTheme.typography.headlineLarge); Text("Dados oficiais do PainelURE", color = Muted) }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (tab == 0) { item { HeroCard(data) }; item { Text("Acesso rápido", style = MaterialTheme.typography.titleLarge) }; items(listOf("Escolas", "Redes e câmeras", "Inventário", "Supervisão")) { QuickCard(it) } }
        else if (tab == 4) item { Button(onClick = onLogout) { Text("Sair da conta") } }
        else { item { Text("${labels[tab]} carregados do backend", color = Muted) }; items((if (tab == 1) data.schools else if (tab == 2) data.networks else data.calendar).coerceAtMost(20)) { QuickCard("Registro ${it + 1}") } }
    } }
}

@Composable private fun HeroCard(d: PanelData) { Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(22.dp)) { Text("DADOS ONLINE", color = Mint, style = MaterialTheme.typography.labelMedium); Text("Tudo sob controle.", style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.height(16.dp)); Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) { Metric(d.schools.toString(), "Escolas"); Metric(d.networks.toString(), "Redes"); Metric(d.calendar.toString(), "Agenda") } } } }
@Composable private fun Metric(v: String, l: String) { Column { Text(v, style = MaterialTheme.typography.titleLarge, color = Lime); Text(l, color = Muted, style = MaterialTheme.typography.bodySmall) } }
@Composable private fun QuickCard(s: String) { Card(colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) { Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.ChevronRight, null, tint = Lime); Spacer(Modifier.width(12.dp)); Text(s, style = MaterialTheme.typography.titleMedium); Spacer(Modifier.weight(1f)); Text("Consultar", color = Muted, style = MaterialTheme.typography.bodySmall) } } }

private object Api {
    private fun request(path: String, method: String, body: String? = null, token: String = ""): JSONObject? = try { val c = URL(API_BASE + path).openConnection() as HttpURLConnection; c.requestMethod = method; c.connectTimeout = 15000; c.readTimeout = 30000; c.setRequestProperty("Content-Type", "application/json"); if (token.isNotBlank()) c.setRequestProperty("Authorization", "Bearer $token"); if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }; val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream; JSONObject(stream.bufferedReader().use { it.readText() }) } catch (_: Exception) { null }
    fun login(user: String, pass: String) = request("/api/auth/login", "POST", JSONObject().put("username", user).put("password", pass).toString())
    fun data(token: String) = request("/api/data", "GET", token = token)?.optJSONObject("data")
}
