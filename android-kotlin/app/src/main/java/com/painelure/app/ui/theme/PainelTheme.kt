package com.painelure.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.unit.dp
/**
 * PainelURE owns this wrapper so its native screens share one visual language.
 * The palette and typography still come from the Finext theme source; only the
 * component geometry is scoped here and Finext files remain untouched. The
 * original Finext type scale is kept intact so headings retain their visual
 * weight and body copy remains readable on a phone.
 */
@Composable
fun PainelTheme(darkTheme: Boolean, content: @Composable () -> Unit) {
    FinanceAppTheme(darkTheme) {
        MaterialTheme(
            shapes = Shapes(
                extraSmall = RoundedCornerShape(8.dp),
                small = RoundedCornerShape(12.dp),
                medium = RoundedCornerShape(16.dp),
                large = RoundedCornerShape(24.dp),
                extraLarge = RoundedCornerShape(28.dp)
            ),
            content = {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.onBackground,
                    content = content
                )
            }
        )
    }
}
