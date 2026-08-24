package com.painelure.app.ui.theme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp
import com.painelure.app.R
val Bg=Color(0xFF08090D); val Surface=Color(0xFF12151E); val Variant=Color(0xFF1C2030); val Lime=Color(0xFFC8F55A); val Mint=Color(0xFF5AF5C8); val Text=Color(0xFFF0F3FF); val Muted=Color(0xFF9EA6BA)
val DmSans=FontFamily(Font(R.font.dm_sans_400,FontWeight.Normal),Font(R.font.dm_sans_500,FontWeight.Medium),Font(R.font.dm_sans_700,FontWeight.Bold),Font(R.font.dm_sans_800,FontWeight.ExtraBold))
val Syne=FontFamily(Font(R.font.syne_600,FontWeight.SemiBold),Font(R.font.syne_700,FontWeight.Bold),Font(R.font.syne_800,FontWeight.ExtraBold))
val PainelTypography=Typography(headlineLarge=TextStyle(fontFamily=Syne,fontWeight=FontWeight.ExtraBold,fontSize=24.sp,lineHeight=29.sp),headlineSmall=TextStyle(fontFamily=Syne,fontWeight=FontWeight.Bold,fontSize=20.sp),titleLarge=TextStyle(fontFamily=Syne,fontWeight=FontWeight.Bold,fontSize=18.sp),titleMedium=TextStyle(fontFamily=DmSans,fontWeight=FontWeight.Bold,fontSize=15.sp),bodyLarge=TextStyle(fontFamily=DmSans,fontSize=14.sp),bodyMedium=TextStyle(fontFamily=DmSans,fontSize=13.sp),bodySmall=TextStyle(fontFamily=DmSans,fontSize=11.sp),labelLarge=TextStyle(fontFamily=DmSans,fontWeight=FontWeight.Bold,fontSize=13.sp),labelMedium=TextStyle(fontFamily=DmSans,fontWeight=FontWeight.Bold,fontSize=11.sp))
@Composable fun PainelURETheme(content:@Composable ()->Unit) { MaterialTheme(colorScheme=darkColorScheme(primary=Lime,onPrimary=Bg,secondary=Mint,background=Bg,surface=Surface,surfaceVariant=Variant,onBackground=Text,onSurface=Text,onSurfaceVariant=Muted),typography=PainelTypography,content=content) }
