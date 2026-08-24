package com.painelure.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Build
import androidx.compose.material.icons.rounded.Checklist
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.DirectionsCar
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Handshake
import androidx.compose.material.icons.rounded.HealthAndSafety
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LocalGasStation
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.PendingActions
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.Savings
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material.icons.rounded.SportsEsports
import androidx.compose.material.icons.rounded.Subscriptions
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material.icons.rounded.TrackChanges
import androidx.compose.material.icons.rounded.Work
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.painelure.app.FinanzaCategories
import com.painelure.app.ui.theme.CategoryColors

fun categoryIcon(category: String): ImageVector = when (FinanzaCategories.normalize(category)) {
    "Alimentacao" -> Icons.Rounded.Restaurant
    "Mercado" -> Icons.Rounded.ShoppingCart
    "Transporte" -> Icons.Rounded.SwapHoriz
    "Moradia" -> Icons.Rounded.Home
    "Saude" -> Icons.Rounded.HealthAndSafety
    "Assinaturas" -> Icons.Rounded.Subscriptions
    "Lazer" -> Icons.Rounded.SportsEsports
    "Educacao" -> Icons.Rounded.School
    "Trabalho", "Freelance" -> Icons.Rounded.Work
    "Carro" -> Icons.Rounded.DirectionsCar
    "Salario", "Investimentos", "Reembolso" -> Icons.Rounded.Payments
    "Fatura" -> Icons.Rounded.CreditCard
    else -> Icons.Rounded.MoreHoriz
}

fun categoryColor(category: String): Color {
    val index = Math.floorMod(FinanzaCategories.normalize(category).hashCode(), CategoryColors.size)
    return CategoryColors[index]
}

fun accountIcon(type: String): ImageVector = when (type.lowercase()) {
    "credit" -> Icons.Rounded.CreditCard
    "savings" -> Icons.Rounded.Savings
    "cash" -> Icons.Rounded.Payments
    "investment" -> Icons.Rounded.AccountBalance
    else -> Icons.Rounded.AccountBalanceWallet
}

fun featureIcon(moduleId: String, itemKey: String = ""): ImageVector = when {
    moduleId == "budgets" -> Icons.Rounded.TrackChanges
    moduleId == "goals" -> Icons.Rounded.Flag
    moduleId == "subscriptions" -> Icons.Rounded.Subscriptions
    moduleId == "debts" -> Icons.AutoMirrored.Rounded.ReceiptLong
    moduleId == "contracts" -> Icons.Rounded.Description
    moduleId == "shopping" && itemKey == "done" -> Icons.Rounded.Checklist
    moduleId == "shopping" -> Icons.Rounded.ShoppingCart
    moduleId == "shopping_lists" -> Icons.Rounded.Checklist
    moduleId == "shared" -> Icons.Rounded.Person
    moduleId == "shared_space" -> Icons.Rounded.Handshake
    moduleId == "shared_approvals" -> Icons.Rounded.PendingActions
    moduleId == "car" && itemKey == "fuel" -> Icons.Rounded.LocalGasStation
    moduleId == "car" -> Icons.Rounded.Build
    moduleId == "vehicles" -> Icons.Rounded.DirectionsCar
    else -> Icons.Rounded.MoreHoriz
}

