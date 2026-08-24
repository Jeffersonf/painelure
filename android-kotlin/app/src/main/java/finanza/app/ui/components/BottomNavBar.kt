package com.painelure.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class AppTab(val label: String) {
    HOME("Início"),
    TRANSACTIONS("Gastos"),
    FUTURE("Venc."),
    CONTAS("Contas"),
    ANALISE("Análise"),
    CONFIG("Ajustes")
}

@Composable
fun BottomNavBar(selected: AppTab, onSelect: (AppTab) -> Unit, modifier: Modifier = Modifier) {
    val items = listOf(
        Triple(AppTab.HOME, Icons.Rounded.Home, "Início"),
        Triple(AppTab.TRANSACTIONS, Icons.Rounded.Payments, "Gastos"),
        Triple(AppTab.FUTURE, Icons.Rounded.PushPin, "Venc.")
    )
    Surface(
        modifier = modifier.fillMaxWidth().height(64.dp),
        shape = RectangleShape,
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        shadowElevation = 14.dp,
        tonalElevation = 0.dp
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            items.forEach { (tab, icon, label) ->
                NavItem(
                    selected = selected == tab,
                    icon = icon,
                    label = label,
                    onClick = { onSelect(tab) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun NavItem(
    selected: Boolean,
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val contentColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = modifier.fillMaxSize().clip(RoundedCornerShape(15.dp))
            .background(Color.Transparent)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, contentDescription = label, tint = contentColor, modifier = Modifier.size(if (selected) 22.dp else 20.dp))
            Text(
                label,
                color = contentColor,
                fontSize = 10.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
                lineHeight = 12.sp,
                maxLines = 1
            )
            Box(
                Modifier.padding(top = 2.dp).size(4.dp).clip(RoundedCornerShape(99.dp))
                    .background(if (selected) contentColor else Color.Transparent)
            )
        }
    }
}

