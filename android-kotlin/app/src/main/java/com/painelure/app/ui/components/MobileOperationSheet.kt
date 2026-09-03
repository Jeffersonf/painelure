package com.painelure.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddTask
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import com.painelure.app.data.PainelRepository
import com.painelure.app.data.PermissionPolicy
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
private fun OperationField(value: String, onValueChange: (String) -> Unit, label: String, enabled: Boolean = true, minLines: Int = 1) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = minLines == 1,
        minLines = minLines,
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = com.painelure.app.ui.theme.AccentLime,
            focusedLabelColor = com.painelure.app.ui.theme.AccentLime,
            cursorColor = com.painelure.app.ui.theme.AccentLime,
            unfocusedBorderColor = PanelBorder,
            unfocusedContainerColor = PanelGlass.copy(alpha = .46f),
            focusedContainerColor = PanelGlass.copy(alpha = .68f)
        )
    )
}

@androidx.compose.material3.ExperimentalMaterial3Api
@Composable
fun MobileOperationSheet(repository: PainelRepository, token: String, customAccess: Map<String, Set<String>> = emptyMap(), onDismiss: () -> Unit) {
    var type by remember { mutableStateOf("calls") }
    var title by remember { mutableStateOf("") }
    var detail by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(java.time.LocalDate.now().toString()) }
    var place by remember { mutableStateOf("") }
    var school by remember { mutableStateOf("") }
    var owner by remember { mutableStateOf("") }
    var time by remember { mutableStateOf(java.time.LocalTime.now().withSecond(0).withNano(0).toString().take(5)) }
    var returnTime by remember { mutableStateOf("") }
    var requester by remember { mutableStateOf("") }
    var vehicle by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Consulta") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(token) {
        withContext(Dispatchers.IO) { repository.currentUser(token) }.getOrNull()?.role
            ?.takeIf(String::isNotBlank)?.let { role = it }
    }
    val allowedTypes = listOf("calls", "ctcVisits", "cars", "calendar", "inventory")
        .filter { PermissionPolicy.can(role, if (it == "ctcVisits") "ctc" else it, customAccess) }
    LaunchedEffect(allowedTypes) { if (type !in allowedTypes) type = allowedTypes.firstOrNull() ?: "calls" }

    ModalBottomSheet(
        onDismissRequest = { if (!busy) onDismiss() },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.align(androidx.compose.ui.Alignment.CenterHorizontally).width(38.dp).height(4.dp).clip(RoundedCornerShape(50.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = .18f)))
            Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(14.dp), color = AccentLime.copy(alpha = .14f)) {
                    Icon(Icons.Default.AddTask, "Nova operação", tint = AccentLime, modifier = Modifier.padding(10.dp).height(22.dp))
                }
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("PAINELURE  /  AÇÃO", style = MaterialTheme.typography.labelSmall, color = AccentLime, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    Text("Nova operação", style = MaterialTheme.typography.headlineSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    Text("Registre uma ação diretamente no painel.", style = MaterialTheme.typography.bodySmall, color = Muted)
                }
                TextButton(onClick = onDismiss, enabled = !busy) { Text("Fechar") }
            }
            Column(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), color = PanelGlass.copy(alpha = .58f), border = BorderStroke(1.dp, PanelBorder)) {
                    Column(Modifier.padding(horizontal = 12.dp, vertical = 11.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Tipo de operação", style = MaterialTheme.typography.titleMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
                            allowedTypes.forEach { option ->
                                FilterChip(selected = type == option, onClick = { type = option; error = "" }, label = { Text(option.replace("ctcVisits", "visita CTC").replace("calls", "chamado").replace("cars", "carro").replace("calendar", "agenda").replace("inventory", "inventário")) }, enabled = !busy, shape = RoundedCornerShape(11.dp), colors = androidx.compose.material3.FilterChipDefaults.filterChipColors(selectedContainerColor = AccentLime.copy(alpha = .16f), selectedLabelColor = AccentLime, labelColor = Muted), border = androidx.compose.material3.FilterChipDefaults.filterChipBorder(enabled = true, selected = type == option, borderColor = MaterialTheme.colorScheme.outline.copy(alpha = .20f), selectedBorderColor = AccentLime.copy(alpha = .52f)))
                            }
                        }
                    }
                }
                Text("Dados da operação", style = MaterialTheme.typography.titleMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
                OperationField(title, { title = it }, "Título", !busy)
                Spacer(Modifier.height(8.dp))
                if (type == "cars" || type == "calendar" || type == "ctcVisits") OperationField(date, { date = it }, "Data", !busy)
                if (type == "ctcVisits") OperationField(time, { time = it }, "Horário", !busy)
                if (type == "cars") OperationField(place, { place = it }, "Destino", !busy)
                if (type == "cars") OperationField(requester, { requester = it }, "Solicitante/setor", !busy)
                if (type == "cars") OperationField(vehicle, { vehicle = it }, "Veículo", !busy)
                if (type == "cars") OperationField(time, { time = it }, "Horário de saída", !busy)
                if (type == "cars") OperationField(returnTime, { returnTime = it }, "Horário de devolução", !busy)
                if (type == "inventory" || type == "ctcVisits") OperationField(school, { school = it }, "Escola", !busy)
                if (type == "ctcVisits") OperationField(owner, { owner = it }, "Responsável", !busy)
                if (type != "inventory") Spacer(Modifier.height(8.dp))
                OperationField(detail, { detail = it }, "Detalhes", !busy, minLines = 3)
                if (error.isNotBlank()) Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.error.copy(alpha = .10f)) {
                    Row(Modifier.padding(horizontal = 11.dp, vertical = 9.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) { Icon(Icons.Default.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                }
            }
            Button(enabled = !busy, onClick = {
                val valid = title.isNotBlank() &&
                    (type != "calls" || detail.isNotBlank()) &&
                    (type != "cars" || (date.isNotBlank() && place.isNotBlank())) &&
                    (type != "calendar" || date.isNotBlank()) &&
                    (type != "inventory" || school.isNotBlank()) &&
                    (type != "ctcVisits" || (date.isNotBlank() && school.isNotBlank() && detail.isNotBlank()))
                if (!valid) {
                    error = "Preencha os campos obrigatórios."
                } else {
                    busy = true
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            repository.createMobileAction(token, type, JSONObject()
                                .put("title", title).put("description", detail).put("date", date)
                                .put("destination", place).put("school", school).put("name", title)
                                .put("owner", owner).put("time", time).put("returnTime", returnTime).put("requester", requester).put("sector", requester).put("vehicle", vehicle).put("place", school).put("objective", detail))
                        }
                        busy = false
                        result.fold({ onDismiss() }, { error = it.message ?: "Não foi possível enviar." })
                    }
                }
            }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = AccentLime, contentColor = BackgroundDark, disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant, disabledContentColor = Muted)) {
                if (busy) CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(18.dp), color = BackgroundDark) else { Icon(Icons.Default.AddTask, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(7.dp)); Text("Enviar operação") }
            }
        }
    }
}
