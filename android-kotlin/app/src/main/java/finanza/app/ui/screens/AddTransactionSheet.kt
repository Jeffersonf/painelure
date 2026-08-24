package com.painelure.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.AttachMoney
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import com.painelure.app.FinanzaCategories

enum class AddStep { VALOR, DESCRICAO, PAGAMENTO }
data class PaymentMethodUi(val id: String, val name: String, val icon: ImageVector = Icons.Rounded.AccountBalanceWallet)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionSheet(methods: List<PaymentMethodUi>, onComplete: (String, String, String, PaymentMethodUi) -> Unit, onDismiss: () -> Unit) {
    val maxHeight = LocalConfiguration.current.screenHeightDp.dp * 0.9f
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)) {
        AddTransactionFlow(methods, onComplete, onDismiss, Modifier.heightIn(max = maxHeight).padding(horizontal = 12.dp, vertical = 6.dp))
    }
}

@Composable
fun AddTransactionFlow(
    methods: List<PaymentMethodUi>,
    onComplete: (String, String, String, PaymentMethodUi) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var step by remember { mutableStateOf(AddStep.VALOR) }
    var amount by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current

    LaunchedEffect(step) {
        if (step != AddStep.PAGAMENTO) {
            focusRequester.requestFocus()
            keyboard?.show()
        }
    }

    Surface(modifier.fillMaxWidth().imePadding(), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(bottom = 18.dp)) {
            Text(
                when (step) {
                    AddStep.VALOR -> "Quanto foi?"
                    AddStep.DESCRICAO -> "O que foi?"
                    AddStep.PAGAMENTO -> "Como voce pagou?"
                },
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                when (step) {
                    AddStep.VALOR -> "Digite o valor e confirme."
                    AddStep.DESCRICAO -> "Uma descricao curta e suficiente."
                    AddStep.PAGAMENTO -> "Escolha a conta usada no gasto."
                },
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.58f),
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 4.dp, bottom = 14.dp)
            )
            when (step) {
                AddStep.VALOR -> {
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it.filter { c -> c.isDigit() || c == ',' || c == '.' } },
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                        placeholder = { Text("0,00") },
                        prefix = { Text("R$ ") },
                        textStyle = MaterialTheme.typography.headlineLarge,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { if (amount.isNotBlank()) step = AddStep.DESCRICAO }),
                        shape = RoundedCornerShape(14.dp)
                    )
                    StepActions("Cancelar", "OK", amount.isNotBlank(), onDismiss) { step = AddStep.DESCRICAO }
                }
                AddStep.DESCRICAO -> {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                        placeholder = { Text("Mercado, Uber, farmacia...") },
                        textStyle = MaterialTheme.typography.titleLarge,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { step = AddStep.PAGAMENTO }),
                        shape = RoundedCornerShape(14.dp)
                    )
                    Text("Categoria", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 14.dp, bottom = 6.dp))
                    Row(
                        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(7.dp)
                    ) {
                        val inferred = FinanzaCategories.infer(description)
                        FinanzaCategories.expenses.forEach { option ->
                            FilterChip(
                                selected = (category.ifBlank { inferred }) == option,
                                onClick = { category = option },
                                label = { Text(option, maxLines = 1) }
                            )
                        }
                    }
                    StepActions("Voltar", "OK", true, { step = AddStep.VALOR }) { step = AddStep.PAGAMENTO }
                }
                AddStep.PAGAMENTO -> {
                    LazyColumn(Modifier.fillMaxWidth().height((methods.size.coerceAtMost(5) * 64).dp)) {
                        items(methods, key = { it.id }) { method ->
                            ListItem(
                                headlineContent = { Text(method.name, style = MaterialTheme.typography.bodyLarge) },
                                leadingContent = { Icon(method.icon, null) },
                                modifier = Modifier.clickable { onComplete(amount, description, category.ifBlank { FinanzaCategories.infer(description) }, method) }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                        }
                    }
                    OutlinedButton(onClick = { step = AddStep.DESCRICAO }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) { Text("Voltar") }
                }
            }
        }
    }
}

@Composable
private fun StepActions(backLabel: String, confirmLabel: String, enabled: Boolean, onBack: () -> Unit, onConfirm: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedButton(onClick = onBack, modifier = Modifier.weight(1f)) { Text(backLabel) }
        Button(onClick = onConfirm, enabled = enabled, modifier = Modifier.weight(1f)) { Text(confirmLabel, fontWeight = FontWeight.SemiBold) }
    }
}

fun defaultPaymentMethods(): List<PaymentMethodUi> = listOf(
    PaymentMethodUi("cash", "Dinheiro", Icons.Rounded.AttachMoney),
    PaymentMethodUi("card", "Cartao", Icons.Rounded.CreditCard)
)

