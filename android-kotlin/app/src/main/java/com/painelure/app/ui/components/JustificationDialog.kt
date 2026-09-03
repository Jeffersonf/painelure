@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.painelure.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.painelure.app.data.PainelRepository
import com.painelure.app.ui.theme.AccentLime
import com.painelure.app.ui.theme.BackgroundDark
import com.painelure.app.ui.theme.Muted
import com.painelure.app.ui.theme.PanelBorder
import com.painelure.app.ui.theme.PanelGlass

@Composable
fun JustificationDialog(repository: PainelRepository, token: String, supervisor: String, onDismiss: () -> Unit) {
    var month by remember { mutableStateOf("") }
    var text by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(14.dp), color = AccentLime.copy(alpha = .14f)) { Icon(Icons.Default.EditNote, "Justificativa", tint = AccentLime, modifier = Modifier.padding(10.dp).size(22.dp)) }
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("PAINELURE  /  SUPERVISÃO", color = AccentLime, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text("Justificativa", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(supervisor, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2)
                }
                TextButton(onClick = onDismiss) { Text("Fechar") }
            }
            Text("Informe o mês e o motivo do acompanhamento.", color = Muted, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(month, { month = it; error = "" }, Modifier.fillMaxWidth(), label = { Text("Mês (AAAA-MM)") }, singleLine = true, shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = AccentLime, focusedLabelColor = AccentLime, cursorColor = AccentLime, unfocusedBorderColor = PanelBorder, unfocusedContainerColor = PanelGlass.copy(alpha = .46f), focusedContainerColor = PanelGlass.copy(alpha = .68f)))
            OutlinedTextField(text, { text = it; error = "" }, Modifier.fillMaxWidth(), label = { Text("Justificativa") }, minLines = 4, shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = AccentLime, focusedLabelColor = AccentLime, cursorColor = AccentLime, unfocusedBorderColor = PanelBorder, unfocusedContainerColor = PanelGlass.copy(alpha = .46f), focusedContainerColor = PanelGlass.copy(alpha = .68f)))
            if (error.isNotBlank()) Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.error.copy(alpha = .10f)) {
                Row(Modifier.padding(horizontal = 11.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
            Button(onClick = {
                if (!Regex("\\d{4}-\\d{2}").matches(month) || text.isBlank()) error = "Informe mês e justificativa."
                else repository.saveSupervisionJustification(token, supervisor, month, text).fold({ onDismiss() }, { error = it.message ?: "Não foi possível salvar." })
            }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = AccentLime, contentColor = BackgroundDark)) {
                Icon(Icons.Default.Save, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(7.dp)); Text("Salvar justificativa")
            }
        }
    }
}
