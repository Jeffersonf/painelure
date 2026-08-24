package com.painelure.app.ui.theme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
val Bg=Color(0xFF08090D); val Surface=Color(0xFF12151E); val Variant=Color(0xFF1C2030); val Lime=Color(0xFFC8F55A); val Mint=Color(0xFF5AF5C8); val Text=Color(0xFFF0F3FF); val Muted=Color(0xFF9EA6BA)
@Composable fun PainelURETheme(content:@Composable ()->Unit) { MaterialTheme(colorScheme=darkColorScheme(primary=Lime,onPrimary=Bg,secondary=Mint,background=Bg,surface=Surface,surfaceVariant=Variant,onBackground=Text,onSurface=Text,onSurfaceVariant=Muted),content=content) }
