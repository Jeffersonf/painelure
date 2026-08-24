package com.painelure.app.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.components.AccountUi
import com.painelure.app.ui.components.AppTab
import com.painelure.app.ui.components.BillUi
import com.painelure.app.ui.components.BottomNavBar
import com.painelure.app.ui.components.TransactionUi
import com.painelure.app.ui.screens.AddTransactionSheet
import com.painelure.app.ui.screens.AnalysisScreen
import com.painelure.app.ui.screens.CategoryUi
import com.painelure.app.ui.screens.ConfigActions
import com.painelure.app.ui.screens.ConfigScreen
import com.painelure.app.ui.screens.ConfigUiState
import com.painelure.app.ui.screens.ContasScreen
import com.painelure.app.ui.screens.HomeScreen
import com.painelure.app.ui.screens.TransactionsScreen
import com.painelure.app.ui.screens.FutureScreen
import com.painelure.app.ui.screens.PaymentMethodUi
import com.painelure.app.ui.screens.MonthTrendUi
import com.painelure.app.ui.screens.FeatureCenterScreen
import com.painelure.app.features.FeatureActions
import com.painelure.app.features.FeatureCenterUiState

data class AppUiState(
    val selectedTab: AppTab,
    val userName: String,
    val greeting: String,
    val period: String,
    val balance: String,
    val accountsTotal: String,
    val income: String,
    val spent: String,
    val paid: String,
    val remaining: String,
    val billProgress: Float,
    val transactions: List<TransactionUi>,
    val accounts: List<AccountUi>,
    val bills: List<BillUi>,
    val categories: List<CategoryUi>,
    val monthlyTrends: List<MonthTrendUi>,
    val config: ConfigUiState,
    val paymentMethods: List<PaymentMethodUi>,
    val features: FeatureCenterUiState
)

data class AppActions(
    val selectTab: (AppTab) -> Unit,
    val refresh: (() -> Unit) -> Unit,
    val openTransaction: (Long) -> Unit,
    val openAccount: (String) -> Unit,
    val openBill: (Long) -> Unit,
    val newAccount: () -> Unit,
    val newDue: () -> Unit,
    val transferAccounts: () -> Unit,
    val saveExpense: (String, String, String, PaymentMethodUi) -> Boolean,
    val config: ConfigActions,
    val features: FeatureActions
)

@Composable
fun AppScaffold(state: AppUiState, actions: AppActions, initialShowFeatures: Boolean = false, initialFeatureModule: String? = null) {
    var showAddSheet by remember { mutableStateOf(false) }
    var showFeatures by remember { mutableStateOf(initialShowFeatures) }
    var navVisible by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    val tabs = AppTab.entries
    val pagerState = rememberPagerState(
        initialPage = tabs.indexOf(state.selectedTab).coerceAtLeast(0),
        pageCount = { tabs.size }
    )
    val scrollConnection = remember {
        object : NestedScrollConnection {
            private var accumulated = 0f

            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source != NestedScrollSource.UserInput || available.y == 0f) return Offset.Zero
                if ((accumulated > 0f && available.y < 0f) || (accumulated < 0f && available.y > 0f)) {
                    accumulated = 0f
                }
                accumulated += available.y
                if (accumulated <= -28f) {
                    navVisible = false
                    accumulated = 0f
                } else if (accumulated >= 20f) {
                    navVisible = true
                    accumulated = 0f
                }
                return Offset.Zero
            }
        }
    }

    LaunchedEffect(state.selectedTab) {
        navVisible = true
        val target = tabs.indexOf(state.selectedTab)
        if (target >= 0 && target != pagerState.currentPage) pagerState.animateScrollToPage(target)
    }
    LaunchedEffect(pagerState.settledPage) {
        val tab = tabs.getOrNull(pagerState.settledPage) ?: return@LaunchedEffect
        if (tab != state.selectedTab) actions.selectTab(tab)
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
        contentColor = MaterialTheme.colorScheme.onBackground
    ) {
        Box(
            Modifier.fillMaxSize()
                .statusBarsPadding()
                .nestedScroll(scrollConnection)
        ) {
        if (showFeatures) {
            FeatureCenterScreen(state.features, actions.features, initialFeatureModule) { showFeatures = false }
        } else {
            HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize().testTag("mainPager"), key = { tabs[it] }) { page ->
                PullToRefreshBox(
                    isRefreshing = refreshing,
                    onRefresh = {
                        if (!refreshing) {
                            refreshing = true
                            actions.refresh { refreshing = false }
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                ) {
                    when (tabs[page]) {
                        AppTab.HOME -> HomeScreen(
                    state.userName, state.greeting, state.period, state.balance, state.income, state.spent,
                    state.accountsTotal, state.remaining, state.bills.size,
                    state.transactions, state.accounts, state.bills, state.categories, state.features,
                    { showAddSheet = true }, { actions.selectTab(AppTab.TRANSACTIONS) },
                    actions.openTransaction, actions.openBill, { showFeatures = true },
                    { actions.selectTab(AppTab.CONTAS) }, { actions.selectTab(AppTab.ANALISE) },
                    { actions.selectTab(AppTab.CONFIG) }
                )
                        AppTab.TRANSACTIONS -> TransactionsScreen(
                    state.userName, state.income, state.spent, state.transactions, { showAddSheet = true }, actions.openTransaction, { actions.selectTab(AppTab.CONFIG) }
                )
                        AppTab.FUTURE -> FutureScreen(
                    state.userName, state.remaining, state.bills, actions.newDue, actions.openBill, { actions.selectTab(AppTab.CONFIG) }
                )
                        AppTab.CONTAS -> ContasScreen(
                    state.userName, state.period, state.accountsTotal, state.billProgress, state.paid, state.remaining,
                    state.accounts, state.bills, actions.newAccount, actions.transferAccounts, actions.openAccount, actions.openBill, { actions.selectTab(AppTab.CONFIG) }
                )
                        AppTab.ANALISE -> AnalysisScreen(state.userName, state.income, state.spent, state.categories, state.monthlyTrends, state.transactions, actions.openTransaction, { actions.selectTab(AppTab.CONFIG) })
                        AppTab.CONFIG -> ConfigScreen(state.config, actions.config)
                    }
                }
            }
        }

            AnimatedVisibility(
                visible = navVisible && !showFeatures,
                modifier = Modifier.align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(top = 0.dp),
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut()
            ) {
                BottomNavBar(
                    selected = state.selectedTab,
                    onSelect = { tab ->
                        navVisible = true
                        actions.selectTab(tab)
                    }
                )
            }
        }
    }

    if (showAddSheet) {
        AddTransactionSheet(
            methods = state.paymentMethods,
            onComplete = { amount, description, category, method ->
                if (actions.saveExpense(amount, description, category, method)) showAddSheet = false
            },
            onDismiss = { showAddSheet = false }
        )
    }
}

