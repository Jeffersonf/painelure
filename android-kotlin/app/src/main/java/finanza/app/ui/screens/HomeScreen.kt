package com.painelure.app.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.painelure.app.features.FeatureCenterUiState
import com.painelure.app.ui.components.AccountUi
import com.painelure.app.ui.components.BillUi
import com.painelure.app.ui.components.ProfilePill
import com.painelure.app.ui.components.TransactionUi

@Composable
fun HomeScreen(
    userName: String,
    greeting: String,
    period: String,
    balance: String,
    income: String,
    spent: String,
    accountsTotal: String,
    dueTotal: String,
    dueCount: Int,
    transactions: List<TransactionUi>,
    accounts: List<AccountUi>,
    bills: List<BillUi>,
    categories: List<CategoryUi>,
    features: FeatureCenterUiState,
    onAdd: () -> Unit,
    onAll: () -> Unit,
    onTransaction: (Long) -> Unit,
    onBill: (Long) -> Unit,
    onFeatures: () -> Unit,
    onAccounts: () -> Unit,
    onAnalysis: () -> Unit,
    onSettings: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 92.dp)
    ) {
        item {
            ProfilePill(userName, onSettings)
            Spacer(Modifier.height(12.dp))
            Text("Dashboard", style = MaterialTheme.typography.headlineLarge)
            Text("Centro do dia para lancar, revisar e decidir seus gastos", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.58f))
            Spacer(Modifier.height(14.dp))
            DashboardWidgets(
                period = period,
                balance = balance,
                income = income,
                spent = spent,
                transactions = transactions,
                accounts = accounts,
                bills = bills,
                categories = categories,
                features = features,
                onAdd = onAdd,
                onAllTransactions = onAll,
                onTransaction = onTransaction,
                onBill = onBill,
                onAccounts = onAccounts,
                onAnalysis = onAnalysis,
                onFeatures = onFeatures,
                onSettings = onSettings
            )
        }
    }
}

