package com.painelure.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = Color(0xFF4F7D00),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4F5B8),
    onPrimaryContainer = TextPrimaryLight,
    secondary = Color(0xFF007B62),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD4F5E9),
    onSecondaryContainer = TextPrimaryLight,
    tertiary = Color(0xFF6D55B7),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFE9E1FF),
    onTertiaryContainer = TextPrimaryLight,
    background = BackgroundLight,
    surface = SurfaceLight,
    onBackground = TextPrimaryLight,
    onSurface = TextPrimaryLight,
    surfaceVariant = SurfaceVariantLight,
    onSurfaceVariant = TextSecondaryLight,
    inverseSurface = HeroCard,
    inverseOnSurface = TextPrimaryDark,
    inversePrimary = AccentLime,
    outline = Color(0xFF8C9787),
    outlineVariant = DividerLight,
    scrim = Color.Black,
    error = Color(0xFFB82E1D),
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD4),
    onErrorContainer = Color(0xFF410001)
)

private val DarkColors = darkColorScheme(
    primary = AccentLime,
    onPrimary = BackgroundDark,
    primaryContainer = Color(0xFF34431A),
    onPrimaryContainer = AccentLime,
    secondary = SuccessGreen,
    onSecondary = BackgroundDark,
    secondaryContainer = Color(0xFF143F36),
    onSecondaryContainer = SuccessGreen,
    tertiary = AccentPurple,
    onTertiary = BackgroundDark,
    tertiaryContainer = Color(0xFF332A54),
    onTertiaryContainer = Color(0xFFE7DEFF),
    background = BackgroundDark,
    surface = SurfaceDark,
    onBackground = TextPrimaryDark,
    onSurface = TextPrimaryDark,
    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = TextSecondaryDark,
    inverseSurface = TextPrimaryDark,
    inverseOnSurface = BackgroundDark,
    inversePrimary = Color(0xFF4F7D00),
    outline = Color(0xFF697084),
    outlineVariant = DividerDark,
    scrim = Color.Black,
    error = DangerRed,
    onError = BackgroundDark,
    errorContainer = Color(0xFF5A211B),
    onErrorContainer = Color(0xFFFFDAD4)
)

@Composable
fun FinanceAppTheme(darkTheme: Boolean, content: @Composable () -> Unit) {
    val colors = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    SideEffect {
        val window = (view.context as? Activity)?.window ?: return@SideEffect
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        WindowCompat.getInsetsController(window, view).apply {
            isAppearanceLightStatusBars = !darkTheme
            isAppearanceLightNavigationBars = !darkTheme
        }
    }
    MaterialTheme(colorScheme = colors, typography = AppTypography, content = content)
}

