@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.painelure.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Sync
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.painelure.app.features.FeatureActions
import com.painelure.app.features.FeatureCenterUiState
import com.painelure.app.features.FeatureFieldKind
import com.painelure.app.features.FeatureFieldUi
import com.painelure.app.features.FeatureItemUi
import com.painelure.app.features.FeatureModuleUi
import com.painelure.app.ui.components.featureIcon
import com.painelure.app.ui.theme.AccentBlue
import com.painelure.app.ui.theme.AccentLime
import com.painelure.app.ui.theme.AccentPurple
import com.painelure.app.ui.theme.DangerRed
import com.painelure.app.ui.theme.SuccessGreen
import com.painelure.app.ui.theme.WarningOrange

@Composable
fun FeatureCenterScreen(
    state: FeatureCenterUiState,
    actions: FeatureActions,
    initialModuleId: String? = null,
    onClose: () -> Unit
) {
    var selectedModuleId by remember { mutableStateOf(initialModuleId) }
    val selected = state.modules.firstOrNull { it.id == selectedModuleId }
    BackHandler {
        if (selected != null) selectedModuleId = null else onClose()
    }

    if (selected == null) {
        FeatureHub(state, { selectedModuleId = it }, actions, onClose)
    } else {
        FeatureModuleScreen(selected, actions) { selectedModuleId = null }
    }
}

@Composable
private fun FeatureHub(
    state: FeatureCenterUiState,
    onModule: (String) -> Unit,
    actions: FeatureActions,
    onClose: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 28.dp)
    ) {
        item {
            ScreenHeader("Central Finanza", "Todos os modulos", onClose)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusPill(if (state.online) "Online" else "Local", if (state.online) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.tertiary, Modifier.weight(1f))
                StatusPill("${state.pendingSync} pendencias", MaterialTheme.colorScheme.primary, Modifier.weight(1f))
            }
            Spacer(Modifier.height(16.dp))
        }
        items(state.modules, key = { it.id }) { module ->
            val accent = featureAccent(module.id)
            Surface(
                modifier = Modifier.fillMaxWidth().padding(bottom = 9.dp).clickable { onModule(module.id) },
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                tonalElevation = 0.dp
            ) {
                Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(44.dp).clip(CircleShape).background(accent.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) { Icon(featureIcon(module.id), contentDescription = null, modifier = Modifier.size(22.dp), tint = accent) }
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(module.title, style = MaterialTheme.typography.titleMedium)
                        Text(module.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.56f))
                    }
                    Text(module.items.size.toString(), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f), fontWeight = FontWeight.SemiBold)
                }
            }
        }
        item {
            Text("Dados", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 12.dp, bottom = 8.dp))
            Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ActionButton("Importar backup JSON", Icons.Rounded.Download, actions.importBackup)
                    ActionButton("Importar CSV ou OFX", Icons.Rounded.Upload, actions.importTransactions)
                    ActionButton("Exportar backup completo", Icons.Rounded.Download, actions.exportBackup)
                    ActionButton("Sincronizar agora", Icons.Rounded.Sync, actions.sync)
                }
            }
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun FeatureModuleScreen(module: FeatureModuleUi, actions: FeatureActions, onBack: () -> Unit) {
    var editing by remember { mutableStateOf<FeatureItemUi?>(null) }
    var creating by remember { mutableStateOf(false) }
    val accent = featureAccent(module.id)
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 28.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Voltar") }
                Box(
                    Modifier.size(38.dp).clip(CircleShape).background(accent.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) { Icon(featureIcon(module.id), contentDescription = null, modifier = Modifier.size(20.dp), tint = accent) }
                Column(Modifier.weight(1f)) {
                    Text(module.title, style = MaterialTheme.typography.headlineMedium)
                    Text(module.subtitle, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.56f), style = MaterialTheme.typography.bodySmall)
                }
                if (module.canCreate) {
                    FilledIconButton(
                        onClick = { creating = true },
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = accent, contentColor = MaterialTheme.colorScheme.background)
                    ) { Icon(Icons.Rounded.Add, contentDescription = "Adicionar") }
                }
            }
            Spacer(Modifier.height(14.dp))
            if (module.insights.isNotEmpty()) {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    module.insights.forEach { insight ->
                        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                            Column(Modifier.width(156.dp).padding(13.dp)) {
                                Text(insight.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.56f))
                                Text(insight.value, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp))
                                if (insight.detail.isNotBlank()) Text(insight.detail, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.48f), modifier = Modifier.padding(top = 3.dp))
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            if (module.trends.isNotEmpty()) {
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                    Column(Modifier.fillMaxWidth().padding(14.dp)) {
                        Text("Evolucao mensal", style = MaterialTheme.typography.titleSmall)
                        Row(Modifier.fillMaxWidth().height(108.dp).padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.Bottom) {
                            module.trends.forEach { trend ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(trend.value, style = MaterialTheme.typography.labelSmall, maxLines = 1)
                                    Box(Modifier.width(12.dp).height(58.dp).clip(RoundedCornerShape(5.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)), contentAlignment = Alignment.BottomCenter) {
                                        if (trend.share > 0f) {
                                            Box(Modifier.fillMaxWidth().fillMaxHeight(trend.share.coerceAtLeast(0.04f)).background(MaterialTheme.colorScheme.primary))
                                        }
                                    }
                                    Text(trend.label, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
        }
        if (module.items.isEmpty()) {
            item {
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                    Column(
                        Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 26.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            Modifier.size(48.dp).clip(CircleShape).background(accent.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) { Icon(featureIcon(module.id), contentDescription = null, tint = accent) }
                        Text("Nada por aqui ainda", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 12.dp))
                        Text(
                            module.emptyText,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.56f),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                        if (module.canCreate) {
                            Button(
                                onClick = { creating = true },
                                modifier = Modifier.padding(top = 14.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = accent, contentColor = MaterialTheme.colorScheme.background)
                            ) {
                                Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Text("Adicionar", modifier = Modifier.padding(start = 7.dp))
                            }
                        }
                    }
                }
            }
        }
        items(module.items, key = { it.id }) { item ->
            FeatureItemCard(
                moduleId = module.id,
                item = item,
                onEdit = { editing = item },
                onDelete = { actions.delete(module.id, item.id) },
                onPrimary = if (item.primaryAction.isBlank()) null else ({ actions.primary(module.id, item.id) }),
                onSecondary = if (item.secondaryAction.isBlank()) null else ({ actions.secondary(module.id, item.id) })
            )
        }
    }

    if (creating || editing != null) {
        FeatureEditor(
            title = if (editing == null) "Novo em ${module.title}" else "Editar ${editing?.title.orEmpty()}",
            fields = editing?.fields ?: module.newFields,
            onDismiss = { creating = false; editing = null },
            onSave = { values ->
                val saved = actions.save(module.id, editing?.id, values)
                if (saved) {
                    creating = false
                    editing = null
                }
                saved
            }
        )
    }
}

@Composable
private fun FeatureItemCard(
    moduleId: String,
    item: FeatureItemUi,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onPrimary: (() -> Unit)?,
    onSecondary: (() -> Unit)?
) {
    val accent = featureAccent(moduleId)
    Surface(
        modifier = Modifier.fillMaxWidth().padding(bottom = 9.dp),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(Modifier.padding(13.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(40.dp).clip(CircleShape).background(accent.copy(alpha = 0.11f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        featureIcon(moduleId, when {
                            item.status == "Comprado" -> "done"
                            item.subtitle.contains("Combustivel", true) -> "fuel"
                            else -> ""
                        }),
                        contentDescription = null,
                        modifier = Modifier.size(21.dp),
                        tint = accent
                    )
                }
                Column(Modifier.weight(1f).padding(horizontal = 11.dp)) {
                    Text(item.title, style = MaterialTheme.typography.titleMedium)
                    if (item.subtitle.isNotBlank()) Text(item.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.56f))
                }
                if (item.value.isNotBlank()) Text(item.value, fontWeight = FontWeight.SemiBold)
            }
            item.progress?.let {
                LinearProgressIndicator(progress = { it }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp).height(6.dp).clip(RoundedCornerShape(3.dp)))
            }
            if (item.status.isNotBlank()) Text(item.status, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.52f), modifier = Modifier.padding(top = 7.dp))
            HorizontalDivider(Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                onPrimary?.let { OutlinedButton(onClick = it, modifier = Modifier.weight(1f)) { Text(item.primaryAction) } }
                onSecondary?.let { OutlinedButton(onClick = it, modifier = Modifier.weight(1f)) { Text(item.secondaryAction) } }
                if (item.canEdit) IconButton(onClick = onEdit) { Icon(Icons.Rounded.Edit, contentDescription = "Editar") }
                if (item.canDelete) IconButton(onClick = onDelete) { Icon(Icons.Rounded.Delete, contentDescription = "Excluir", tint = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

@Composable
private fun FeatureEditor(title: String, fields: List<FeatureFieldUi>, onDismiss: () -> Unit, onSave: (Map<String, String>) -> Boolean) {
    val values = remember(fields) { mutableStateMapOf<String, String>().apply { fields.forEach { put(it.key, it.value) } } }
    var validationError by remember(fields) { mutableStateOf(false) }
    val maxHeight = LocalConfiguration.current.screenHeightDp.dp * 0.9f
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            Modifier.fillMaxWidth().heightIn(max = maxHeight).verticalScroll(rememberScrollState()).imePadding()
                .padding(horizontal = 14.dp).padding(bottom = 24.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 14.dp))
            fields.forEach { field ->
                if (field.kind == FeatureFieldKind.CHOICE) {
                    Text(field.label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 8.dp, bottom = 5.dp))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        field.options.forEach { option ->
                            FilterChip(
                                selected = values[field.key] == option,
                                onClick = { values[field.key] = option },
                                label = { Text(option, maxLines = 1) },
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = values[field.key].orEmpty(),
                        onValueChange = { values[field.key] = it },
                        label = { Text(field.label) },
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = when (field.kind) {
                                FeatureFieldKind.MONEY -> KeyboardType.Decimal
                                FeatureFieldKind.NUMBER -> KeyboardType.Number
                                else -> KeyboardType.Text
                            }
                        )
                    )
                }
            }
            if (validationError) Text("Revise os campos obrigatorios e os valores informados.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            Button(onClick = {
                validationError = false
                if (!onSave(values.toMap())) validationError = true
            }, modifier = Modifier.fillMaxWidth().height(50.dp).padding(top = 6.dp), shape = RoundedCornerShape(14.dp)) { Text("Salvar") }
        }
    }
}

private fun featureAccent(moduleId: String): Color = when (moduleId) {
    "goals", "shared" -> AccentPurple
    "subscriptions", "car" -> WarningOrange
    "debts" -> DangerRed
    "contracts" -> AccentBlue
    "shopping" -> SuccessGreen
    else -> AccentLime
}

@Composable
private fun ScreenHeader(title: String, subtitle: String, onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Voltar") }
        Column {
            Text(title, style = MaterialTheme.typography.headlineMedium)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.56f))
        }
    }
    Spacer(Modifier.height(12.dp))
}

@Composable
private fun StatusPill(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(modifier.clip(RoundedCornerShape(12.dp)).background(color.copy(alpha = 0.12f)).padding(horizontal = 12.dp, vertical = 9.dp), contentAlignment = Alignment.Center) {
        Text(text, color = color, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun ActionButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        Text(label, modifier = Modifier.padding(start = 8.dp))
    }
}

