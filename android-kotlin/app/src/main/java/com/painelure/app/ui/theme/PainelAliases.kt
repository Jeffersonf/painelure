package com.painelure.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Aliases used by the PainelURE domain layer while retaining the Finext theme source.
val Lime = AccentLime
val Mint = SuccessGreen
val Purple = AccentPurple
val PanelSurface: Color
    @Composable get() = PanelGlass
val Muted: Color
    @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant
val PanelGlass: Color
    @Composable get() = if (MaterialTheme.colorScheme.background == BackgroundDark) GlassDark else GlassLight
val PanelBorder: Color
    @Composable get() = if (MaterialTheme.colorScheme.background == BackgroundDark) GlassBorderDark else GlassBorderLight
val PanelSubtle: Color
    @Composable get() = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = if (MaterialTheme.colorScheme.background == BackgroundDark) .42f else .68f)
val MutedLight = TextSecondaryLight
val TextDark = TextPrimaryDark
val TextLight = TextPrimaryLight
val PainelTypography = AppTypography
