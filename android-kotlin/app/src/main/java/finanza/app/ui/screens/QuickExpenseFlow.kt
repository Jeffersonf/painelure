package com.painelure.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

private enum class QuickStep { VALOR, DESCRICAO }

private val QuickGlass = Color(0xED12151E)
private val QuickGlassSoft = Color(0xFF1C2030)
private val QuickBorder = Color(0x3DC8F55A)
private val QuickBlue = Color(0xFFC8F55A)

@Composable
fun QuickExpenseFlow(
    methods: List<PaymentMethodUi>,
    onComplete: (String, String, PaymentMethodUi) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var step by remember { mutableStateOf(QuickStep.VALOR) }
    var amountDigits by remember { mutableStateOf("0") }
    var description by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current

    fun moveTo(next: QuickStep) {
        keyboard?.hide()
        step = next
    }

    LaunchedEffect(step) {
        if (step == QuickStep.VALOR || step == QuickStep.DESCRICAO) {
            delay(120)
            focusRequester.requestFocus()
            keyboard?.show()
        }
    }

    BackHandler {
        when (step) {
            QuickStep.VALOR -> onDismiss()
            QuickStep.DESCRICAO -> step = QuickStep.VALOR
        }
    }

    Box(modifier.fillMaxWidth().imePadding(), contentAlignment = Alignment.TopCenter) {
        AnimatedContent(
            targetState = step,
            transitionSpec = {
                (fadeIn(tween(150)) + scaleIn(tween(180), initialScale = 0.97f)) togetherWith
                    (fadeOut(tween(110)) + scaleOut(tween(110), targetScale = 0.98f)) using
                    SizeTransform(clip = false)
            },
            label = "quickExpenseStep"
        ) { current ->
            when (current) {
                QuickStep.VALOR -> QuickInputPanel(
                    prompt = "Qual o valor do gasto?",
                    value = amountDigits,
                    placeholder = "",
                    keyboardType = KeyboardType.Number,
                    focusRequester = focusRequester,
                    confirmEnabled = amountDigits.any { it != '0' },
                    onValueChange = { raw ->
                        amountDigits = raw.filter(Char::isDigit)
                            .take(11)
                            .trimStart('0')
                            .ifEmpty { "0" }
                    },
                    onCancel = onDismiss,
                    onConfirm = { moveTo(QuickStep.DESCRICAO) },
                    visualTransformation = CurrencyVisualTransformation
                )

                QuickStep.DESCRICAO -> QuickInputPanel(
                    prompt = "O que foi?",
                    value = description,
                    placeholder = "Descri\u00e7\u00e3o",
                    keyboardType = KeyboardType.Text,
                    focusRequester = focusRequester,
                    confirmEnabled = description.isNotBlank(),
                    onValueChange = { description = it.take(80) },
                    onCancel = onDismiss,
                    onConfirm = {
                        methods.firstOrNull()?.let { method ->
                            keyboard?.hide()
                            onComplete(decimalAmount(amountDigits), description, method)
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun QuickInputPanel(
    prompt: String,
    value: String,
    placeholder: String,
    keyboardType: KeyboardType,
    focusRequester: FocusRequester,
    confirmEnabled: Boolean,
    onValueChange: (String) -> Unit,
    onCancel: () -> Unit,
    onConfirm: () -> Unit,
    visualTransformation: VisualTransformation = VisualTransformation.None
) {
    QuickGlassPanel {
        Text(
            prompt,
            color = Color.White.copy(alpha = 0.88f),
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 11.dp)
        )
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth().height(54.dp).focusRequester(focusRequester),
            singleLine = true,
            textStyle = TextStyle(
                color = Color.White,
                fontSize = 27.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                letterSpacing = 0.sp
            ),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Done, autoCorrectEnabled = false),
            keyboardActions = KeyboardActions(onDone = { if (confirmEnabled) onConfirm() }),
            cursorBrush = SolidColor(Color.Transparent),
            visualTransformation = visualTransformation,
            decorationBox = { inner ->
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    if (value.isBlank()) {
                        Text(
                            placeholder,
                            color = Color.White.copy(alpha = 0.28f),
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    inner()
                }
            }
        )
        QuickActions(confirmEnabled, onCancel, onConfirm)
    }
}

private object CurrencyVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val formatted = formatCurrency(text.text)
        val originalLength = text.length
        return TransformedText(
            AnnotatedString(formatted),
            object : OffsetMapping {
                override fun originalToTransformed(offset: Int) = formatted.length
                override fun transformedToOriginal(offset: Int) = originalLength
            }
        )
    }
}

private fun formatCurrency(rawDigits: String): String {
    val digits = rawDigits.filter(Char::isDigit).trimStart('0').ifEmpty { "0" }
    val padded = digits.padStart(3, '0')
    val integerPart = padded.dropLast(2)
        .reversed()
        .chunked(3)
        .joinToString(".")
        .reversed()
    return "R$ $integerPart,${padded.takeLast(2)}"
}

private fun decimalAmount(rawDigits: String): String {
    val digits = rawDigits.filter(Char::isDigit).trimStart('0').ifEmpty { "0" }
    val padded = digits.padStart(3, '0')
    return "${padded.dropLast(2).trimStart('0').ifEmpty { "0" }}.${padded.takeLast(2)}"
}

@Composable
private fun QuickGlassPanel(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(QuickGlass)
            .border(1.dp, Color.White.copy(alpha = 0.09f), RoundedCornerShape(20.dp)),
        content = content
    )
}

@Composable
private fun QuickActions(enabled: Boolean, onCancel: () -> Unit, onConfirm: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        QuickActionButton("Cancelar", QuickGlassSoft, true, onCancel, Modifier.weight(1f))
        QuickActionButton("OK", QuickBlue, enabled, onConfirm, Modifier.weight(1f))
    }
}

@Composable
private fun QuickActionButton(
    label: String,
    color: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier.height(42.dp).clip(RoundedCornerShape(21.dp))
            .background(if (enabled) color else color.copy(alpha = color.alpha * 0.24f))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            label,
            color = (if (color.luminance() > 0.5f) Color(0xFF08090D) else Color.White)
                .copy(alpha = if (enabled) 1f else 0.42f),
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

