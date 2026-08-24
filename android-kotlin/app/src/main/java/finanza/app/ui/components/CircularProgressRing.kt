package com.painelure.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun CircularProgressRing(progress: Float, modifier: Modifier = Modifier) {
    val normalized = progress.coerceIn(0f, 1f)
    Box(modifier.size(64.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(64.dp)) {
            drawArc(Color.White.copy(alpha = 0.14f), -90f, 360f, false, style = Stroke(6.dp.toPx(), cap = StrokeCap.Round))
            drawArc(Color(0xFFD2F668), -90f, 360f * normalized, false, style = Stroke(6.dp.toPx(), cap = StrokeCap.Round))
        }
        Text("${(normalized * 100).toInt()}%", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
    }
}

