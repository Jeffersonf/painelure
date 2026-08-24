package com.painelure.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.theme.DangerRed
import com.painelure.app.ui.theme.DangerRedBg
import com.painelure.app.ui.theme.SuccessGreen
import com.painelure.app.ui.theme.SuccessGreenBg
import com.painelure.app.ui.theme.WarningOrange

enum class BillStatus { ATRASADO, PAGO, PENDENTE }

@Composable
fun StatusBadge(status: BillStatus, modifier: Modifier = Modifier) {
    val colors = when (status) {
        BillStatus.ATRASADO -> DangerRedBg to DangerRed
        BillStatus.PAGO -> SuccessGreenBg to SuccessGreen
        BillStatus.PENDENTE -> WarningOrange.copy(alpha = 0.14f) to WarningOrange
    }
    val label = when (status) {
        BillStatus.ATRASADO -> "Atrasado"
        BillStatus.PAGO -> "Pago"
        BillStatus.PENDENTE -> "Pendente"
    }
    Text(
        text = label,
        color = colors.second,
        style = MaterialTheme.typography.labelSmall,
        modifier = modifier.clip(RoundedCornerShape(7.dp)).background(colors.first).padding(horizontal = 8.dp, vertical = 4.dp)
    )
}

