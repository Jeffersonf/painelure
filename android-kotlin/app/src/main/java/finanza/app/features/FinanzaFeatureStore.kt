package com.painelure.app.features

import android.content.Context
import android.content.SharedPreferences
import com.painelure.app.FinanzaPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import java.util.UUID

class FinanzaFeatureStore(
    context: Context,
    private val prefs: SharedPreferences = FinanzaPreferences.get(context)
) {
    private val money = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("pt").setRegion("BR").build())

    fun buildUiState(
        spendingByCategory: Map<String, Double>,
        sharedBalances: Map<String, Double> = emptyMap(),
        online: Boolean,
        canWrite: Boolean = true
    ): FeatureCenterUiState {
        return FeatureCenterUiState(
            modules = listOf(
                budgetModule(spendingByCategory),
                goalModule(),
                subscriptionModule(),
                debtModule(),
                contractModule(),
                shoppingListModule(),
                shoppingModule(),
                sharedSpaceModule(canWrite),
                sharedModule(sharedBalances, canWrite),
                vehicleModule(),
                carModule()
            ),
            pendingSync = queue().length(),
            online = online
        )
    }

    fun save(moduleId: String, itemId: String?, values: Map<String, String>): FeatureMutation? {
        if (moduleId == "shared_space") {
            val root = sharedState()
            val name = values["name"].orEmpty().trim()
            if (name.isBlank()) return null
            root.put("name", name)
            root.put("mode", values["mode"].orEmpty().ifBlank { "couple" })
            prefs.edit().putString("feature_shared", root.toString()).apply()
            return FeatureMutation(moduleId, "update", "shared_space", root.toString())
        }
        val target = when (moduleId) {
            "budgets" -> arrayKey("feature_budgets")
            "goals" -> arrayKey("feature_goals")
            "subscriptions", "debts", "contracts" -> commitmentArray(moduleId)
            "shopping_lists" -> shoppingLists()
            "shopping" -> shoppingItems()
            "shared" -> sharedPeople()
            "vehicles" -> carVehicles()
            "car" -> carEvents()
            else -> return null
        }
        val id = itemId ?: localId(moduleId)
        val existing = itemId?.let { currentId ->
            indexOf(target, currentId).takeIf { it >= 0 }?.let(target::optJSONObject)
        }
        val item = JSONObject(existing?.toString() ?: "{}").put("id", id)
        values.forEach { (key, value) ->
            when (key) {
                "limit", "target", "current", "monthly", "amount", "totalAmount", "outstandingAmount",
                "installmentAmount", "interestRate", "monthlyAmount", "odometer", "liters", "price", "pricePerLiter" ->
                    item.put(key, decimal(value))
                "remainingInstallments", "totalInstallments", "billingDay" -> item.put(key, value.toIntOrNull() ?: 0)
                "bought" -> item.put(key, value.toBoolean())
                else -> item.put(key, value.trim())
            }
        }
        if (moduleId == "shared") {
            val root = sharedState()
            val ownerId = root.optString("ownerPersonId")
            item.put("permission", if (id == ownerId) "owner" else normalizePermission(item.optString("permission", "editor")))
            if (!item.has("color")) item.put("color", "#0A84FF")
        }
        if (moduleId == "shopping") {
            item.put("listId", item.optString("listId", defaultShoppingListId()))
            item.put("createdAt", item.optLong("createdAt", System.currentTimeMillis()))
        }
        if (moduleId == "car") {
            item.put("vehicleId", item.optString("vehicleId", defaultVehicleId()))
            item.put("date", item.optString("date", LocalDate.now().toString()))
            val pricePerLiter = item.optDouble("pricePerLiter", item.optDouble("price", 0.0))
            item.put("pricePerLiter", pricePerLiter)
            if (item.optDouble("amount", 0.0) <= 0.0 && item.optDouble("liters", 0.0) > 0.0 && pricePerLiter > 0.0) {
                item.put("amount", item.optDouble("liters") * pricePerLiter)
            }
            if (item.optString("title").isBlank()) item.put("title", if (item.optString("type") == "fuel") "Abastecimento" else "Despesa do carro")
        }
        if (!validItem(moduleId, item)) return null
        upsert(target, item)
        persistTarget(moduleId, target)
        if (moduleId == "car") updateVehicleOdometer(item)
        return FeatureMutation(moduleId, if (itemId == null) "create" else "update", id, item.toString())
    }

    fun delete(moduleId: String, itemId: String): FeatureMutation? {
        if (moduleId == "shopping_lists" && shoppingItemsFor(itemId) > 0) return null
        if (moduleId == "vehicles" && jsonObjects(carEvents()).any { it.optString("vehicleId") == itemId }) return null
        if (moduleId == "shared" && sharedState().optString("ownerPersonId") == itemId) return null
        val target = when (moduleId) {
            "budgets" -> arrayKey("feature_budgets")
            "goals" -> arrayKey("feature_goals")
            "subscriptions", "debts", "contracts" -> commitmentArray(moduleId)
            "shopping_lists" -> shoppingLists()
            "shopping" -> shoppingItems()
            "shared" -> sharedPeople()
            "vehicles" -> carVehicles()
            "car" -> carEvents()
            else -> return null
        }
        remove(target, itemId)
        persistTarget(moduleId, target)
        return FeatureMutation(moduleId, "delete", itemId, "{}")
    }

    fun carTransactionId(itemId: String): Long? {
        val index = indexOf(carEvents(), itemId)
        return if (index >= 0) carEvents().optJSONObject(index)?.optLong("txId", 0L)?.takeIf { it > 0L } else null
    }

    fun attachCarTransaction(itemId: String, transactionId: Long, accountId: String): FeatureMutation? {
        val target = carEvents()
        val index = indexOf(target, itemId)
        if (index < 0) return null
        val item = target.getJSONObject(index).put("txId", transactionId).put("accountId", accountId)
        persistTarget("car", target)
        return FeatureMutation("car", "update", itemId, item.toString())
    }

    fun primary(moduleId: String, itemId: String): FeatureMutation? {
        val target = when (moduleId) {
            "goals" -> arrayKey("feature_goals")
            "shopping" -> shoppingItems()
            "debts" -> commitmentArray("debts")
            else -> return null
        }
        val index = indexOf(target, itemId)
        if (index < 0) return null
        val item = target.getJSONObject(index)
        when (moduleId) {
            "goals" -> item.put("current", (item.optDouble("current") + item.optDouble("monthly").coerceAtLeast(1.0)).coerceAtMost(item.optDouble("target")))
            "shopping" -> item.put("bought", !item.optBoolean("bought"))
            "debts" -> {
                item.put("outstandingAmount", (item.optDouble("outstandingAmount") - item.optDouble("installmentAmount")).coerceAtLeast(0.0))
                item.put("remainingInstallments", (item.optInt("remainingInstallments") - 1).coerceAtLeast(0))
                item.put("nextDueDate", advanceDate(item.optString("nextDueDate"), 1))
                item.remove("linkedDueId")
                if (item.optDouble("outstandingAmount") <= 0.0 || item.optInt("remainingInstallments") == 0) item.put("status", "closed")
            }
        }
        persistTarget(moduleId, target)
        return FeatureMutation(moduleId, "primary", itemId, item.toString())
    }

    fun linkedDueId(moduleId: String, itemId: String): Long? {
        if (moduleId !in COMMITMENT_MODULES) return null
        val index = indexOf(commitmentArray(moduleId), itemId)
        if (index < 0) return null
        return commitmentArray(moduleId).optJSONObject(index)?.optLong("linkedDueId", 0L)?.takeIf { it > 0L }
    }

    fun attachLinkedDue(moduleId: String, itemId: String, dueId: Long): FeatureMutation? {
        if (moduleId !in COMMITMENT_MODULES) return null
        val target = commitmentArray(moduleId)
        val index = indexOf(target, itemId)
        if (index < 0) return null
        val item = target.getJSONObject(index).put("linkedDueId", dueId)
        persistTarget(moduleId, target)
        return FeatureMutation(moduleId, "update", itemId, item.toString())
    }

    fun detachLinkedDue(moduleId: String, itemId: String): FeatureMutation? {
        if (moduleId !in COMMITMENT_MODULES) return null
        val target = commitmentArray(moduleId)
        val index = indexOf(target, itemId)
        if (index < 0) return null
        val item = target.getJSONObject(index)
        item.remove("linkedDueId")
        persistTarget(moduleId, target)
        return FeatureMutation(moduleId, "update", itemId, item.toString())
    }

    fun advanceAfterDuePaid(moduleId: String, itemId: String): FeatureMutation? {
        if (moduleId !in COMMITMENT_MODULES) return null
        val target = commitmentArray(moduleId)
        val index = indexOf(target, itemId)
        if (index < 0) return null
        val item = target.getJSONObject(index)
        when (moduleId) {
            "subscriptions" -> item.put("renewalDate", advanceDate(item.optString("renewalDate"), 1))
            "debts" -> {
                val outstanding = (item.optDouble("outstandingAmount") - item.optDouble("installmentAmount")).coerceAtLeast(0.0)
                val remaining = (item.optInt("remainingInstallments") - 1).coerceAtLeast(0)
                item.put("outstandingAmount", outstanding)
                    .put("remainingInstallments", remaining)
                    .put("nextDueDate", advanceDate(item.optString("nextDueDate"), 1))
                if (outstanding <= 0.0 || remaining == 0) item.put("status", "closed")
            }
            "contracts" -> item.put("renewalDate", advanceDate(item.optString("renewalDate"), 12))
        }
        item.remove("linkedDueId")
        persistTarget(moduleId, target)
        return FeatureMutation(moduleId, "update", itemId, item.toString())
    }

    fun enqueue(mutation: FeatureMutation) {
        val queue = queue()
        if (mutation.moduleId in STATE_MODULES) {
            for (index in queue.length() - 1 downTo 0) {
                if (queue.optJSONObject(index)?.optString("queueKey") == STATE_QUEUE_KEY) queue.remove(index)
            }
        }
        queue.put(JSONObject().apply {
            put("moduleId", mutation.moduleId)
            put("action", mutation.action)
            put("itemId", mutation.itemId)
            put("payload", mutation.payload)
            if (mutation.moduleId in STATE_MODULES) put("queueKey", STATE_QUEUE_KEY)
            put("createdAt", System.currentTimeMillis())
        })
        prefs.edit().putString(KEY_QUEUE, queue.toString()).apply()
    }

    fun pendingMutations(): List<FeatureMutation> = buildList {
        val source = queue()
        for (index in 0 until source.length()) {
            val item = source.optJSONObject(index) ?: continue
            add(FeatureMutation(item.optString("moduleId"), item.optString("action"), item.optString("itemId"), item.optString("payload", "{}")))
        }
    }

    fun clearQueue() = prefs.edit().putString(KEY_QUEUE, "[]").apply()

    @Synchronized
    fun acknowledge(mutation: FeatureMutation) {
        val source = queue()
        val remaining = JSONArray()
        var removed = false
        for (index in 0 until source.length()) {
            val item = source.optJSONObject(index) ?: continue
            val matches = !removed &&
                item.optString("moduleId") == mutation.moduleId &&
                item.optString("action") == mutation.action &&
                item.optString("itemId") == mutation.itemId &&
                item.optString("payload", "{}") == mutation.payload
            if (matches) removed = true else remaining.put(item)
        }
        prefs.edit().putString(KEY_QUEUE, remaining.toString()).apply()
    }

    fun applyRemote(budgets: JSONArray, goals: JSONArray, state: JSONObject) {
        prefs.edit()
            .putString("feature_budgets", normalizeBudgets(budgets).toString())
            .putString("feature_goals", normalizeGoals(goals).toString())
            .putString("feature_shopping", normalizeShopping(state.optJSONObject("shopping") ?: JSONObject()).toString())
            .putString("feature_car", normalizeCar(state.optJSONObject("car") ?: state.optJSONObject("vehicle") ?: JSONObject()).toString())
            .putString("feature_shared", normalizeShared(remoteShared(state)).toString())
            .putString("feature_commitments", normalizeCommitments(remoteCommitments(state)).toString())
            .apply()
    }

    fun statePayload(baseState: JSONObject): JSONObject {
        val payload = JSONObject(baseState.toString())
        val settings = payload.optJSONObject("settings") ?: JSONObject()
        val rates = settings.optJSONObject("rates") ?: JSONObject()
        rates.put("sharedSpace", sharedState()).put("shared_space", sharedState())
        settings.put("rates", rates)
        settings.put("sharedSpace", sharedState()).put("shared_space", sharedState())
        settings.put("commitments", commitments())
        payload.put("shopping", shopping())
        payload.put("car", car())
        payload.put("settings", settings)
        return payload
    }

    fun backupPayload(): JSONObject = JSONObject().apply {
        put("budgets", arrayKey("feature_budgets"))
        put("goals", arrayKey("feature_goals"))
        put("shopping", shopping())
        put("car", car())
        put("settings", JSONObject().put("sharedSpace", sharedState()).put("commitments", commitments()))
    }

    fun sharedPeopleCount(): Int = sharedPeople().length()

    fun sharedSpacePayload(): JSONObject = JSONObject(sharedState().toString())

    fun sharedPeopleOptions(): List<Pair<String, String>> = jsonObjects(sharedPeople()).map { person ->
        person.optString("id") to person.optString("name", "Pessoa")
    }

    fun sharedOwnerId(): String = sharedState().optString("ownerPersonId")

    fun equalSplitMeta(
        payerId: String = sharedOwnerId(),
        participantIds: List<String> = sharedPeopleOptions().map { it.first },
        requestApproval: Boolean = false
    ): JSONObject? {
        val people = sharedPeople()
        if (people.length() < 2) return null
        val ownerId = sharedState().optString("ownerPersonId", people.optJSONObject(0)?.optString("id").orEmpty())
        val validIds = sharedPeopleOptions().map { it.first }.toSet()
        val participants = participantIds.filter { it in validIds }.distinct()
        if (participants.size < 2 || payerId !in validIds) return null
        return JSONObject().apply {
            put("kind", "equal")
            put("payerId", payerId.ifBlank { ownerId })
            put("participants", JSONArray().apply {
                participants.forEach(::put)
            })
            put("approval", JSONObject().apply {
                put("status", if (requestApproval) "pending" else "approved")
                if (requestApproval) {
                    put("requestedAt", System.currentTimeMillis())
                    put("requestedBy", ownerId)
                } else {
                    put("approvedAt", System.currentTimeMillis())
                    put("approvedBy", ownerId)
                }
            })
        }
    }

    fun settlementMeta(personId: String, ownerPaid: Boolean): JSONObject? {
        val people = sharedPeople()
        if (people.length() < 2) return null
        val ownerId = sharedState().optString("ownerPersonId", people.optJSONObject(0)?.optString("id").orEmpty())
        return JSONObject().apply {
            put("kind", "settlement")
            put("fromPersonId", if (ownerPaid) ownerId else personId)
            put("toPersonId", if (ownerPaid) personId else ownerId)
        }
    }

    fun sharedInviteData(): JSONObject? {
        val root = sharedState()
        val people = sharedPeople()
        if (people.length() < 2) return null
        return JSONObject().apply {
            put("v", 1)
            put("mode", root.optString("mode", "couple"))
            put("name", root.optString("name", "Finanza compartilhado"))
            put("ownerPersonId", root.optString("ownerPersonId", people.optJSONObject(0)?.optString("id").orEmpty()))
            put("people", people)
        }
    }

    fun mergeSharedInvite(payload: JSONObject): FeatureMutation? {
        if (payload.optInt("v", 1) != 1) return null
        val incoming = normalizeShared(payload)
        val incomingPeople = incoming.optJSONArray("people") ?: return null
        if (incomingPeople.length() == 0) return null
        val current = sharedState()
        val ownerId = current.optString("ownerPersonId")
        val merged = JSONArray()
        val names = mutableSetOf<String>()
        fun append(person: JSONObject) {
            val name = person.optString("name").trim()
            val key = name.lowercase(Locale.ROOT)
            if (name.isBlank() || !names.add(key)) return
            val id = person.optString("id").ifBlank { localId("person") }
            merged.put(JSONObject(person.toString())
                .put("id", id)
                .put("name", name)
                .put("permission", if (id == ownerId) "owner" else normalizePermission(person.optString("permission", "editor")))
                .put("color", person.optString("color", "#0A84FF")))
        }
        val currentPeople = current.optJSONArray("people") ?: JSONArray()
        for (index in 0 until currentPeople.length()) currentPeople.optJSONObject(index)?.let(::append)
        for (index in 0 until incomingPeople.length()) incomingPeople.optJSONObject(index)?.let(::append)
        val next = JSONObject(current.toString())
            .put("mode", incoming.optString("mode", current.optString("mode", "couple")))
            .put("name", incoming.optString("name", current.optString("name", "Meu espaco")))
            .put("ownerPersonId", ownerId)
            .put("people", merged)
        prefs.edit().putString("feature_shared", normalizeShared(next).toString()).apply()
        return FeatureMutation("shared_space", "update", "shared_space", normalizeShared(next).toString())
    }

    fun importBackup(data: JSONObject, merge: Boolean) {
        val settings = data.optJSONObject("settings") ?: JSONObject()
        importArray("feature_budgets", data.optJSONArray("budgets") ?: JSONArray(), merge)
        importArray("feature_goals", data.optJSONArray("goals") ?: JSONArray(), merge)
        importObject("feature_shopping", normalizeShopping(data.optJSONObject("shopping") ?: JSONObject()), merge, listOf("lists", "items"))
        importObject("feature_car", normalizeCar(data.optJSONObject("car") ?: JSONObject()), merge, listOf("vehicles", "events"))
        val shared = settings.optJSONObject("sharedSpace") ?: settings.optJSONObject("shared_space") ?: JSONObject()
        val commitments = normalizeCommitments(settings.optJSONObject("commitments") ?: JSONObject())
        if (shared.length() > 0 || !merge) prefs.edit().putString("feature_shared", normalizeShared(shared).toString()).apply()
        if (commitments.length() > 0 || !merge) {
            importObject("feature_commitments", commitments, merge, COMMITMENT_MODULES.toList())
        }
    }

    private fun budgetModule(spending: Map<String, Double>): FeatureModuleUi {
        val fields = listOf(
            field("category", "Categoria"),
            field("limit", "Limite", kind = FeatureFieldKind.MONEY)
        )
        return FeatureModuleUi("budgets", "Orcamentos", "Limites por categoria", "\uD83C\uDFAF", items(arrayKey("feature_budgets")) { item ->
            val limit = item.optDouble("limit")
            val spent = spending[item.optString("category")] ?: 0.0
            featureItem(item, item.optString("category", "Categoria"), "${money.format(spent)} de ${money.format(limit)}", money.format(limit), "\uD83C\uDFAF", fields,
                progress = if (limit > 0) (spent / limit).toFloat().coerceIn(0f, 1f) else 0f,
                status = if (spent > limit) "Excedido" else "Disponivel")
        }, fields, "Nenhum orcamento criado.")
    }

    private fun goalModule(): FeatureModuleUi {
        val fields = listOf(
            field("name", "Nome"), field("icon", "Icone", "\uD83C\uDFAF"),
            field("target", "Objetivo", kind = FeatureFieldKind.MONEY),
            field("current", "Guardado", kind = FeatureFieldKind.MONEY),
            field("deadline", "Prazo", LocalDate.now().plusMonths(6).toString(), FeatureFieldKind.DATE),
            field("monthly", "Aporte mensal", kind = FeatureFieldKind.MONEY), field("desc", "Descricao")
        )
        return FeatureModuleUi("goals", "Metas", "Objetivos e aportes", "\uD83C\uDFC1", items(arrayKey("feature_goals")) { item ->
            val target = item.optDouble("target")
            val current = item.optDouble("current")
            featureItem(item, item.optString("name", "Meta"), "Prazo ${item.optString("deadline", "sem data")}", money.format(current), item.optString("icon", "\uD83C\uDFC1"), fields,
                progress = if (target > 0) (current / target).toFloat().coerceIn(0f, 1f) else 0f,
                status = "de ${money.format(target)}", primary = "Adicionar aporte")
        }, fields, "Nenhuma meta criada.")
    }

    private fun subscriptionModule(): FeatureModuleUi {
        val fields = listOf(
            field("name", "Assinatura"), field("amount", "Valor", kind = FeatureFieldKind.MONEY),
            field("category", "Categoria"), field("renewalDate", "Proxima cobranca", LocalDate.now().plusMonths(1).toString(), FeatureFieldKind.DATE),
            field("billingDay", "Dia de cobranca", LocalDate.now().dayOfMonth.toString(), FeatureFieldKind.NUMBER),
            field("paymentMethod", "Forma de pagamento", "credit", FeatureFieldKind.CHOICE, listOf("credit", "debit", "pix", "cash")),
            field("accountId", "Conta ou cartao"),
            field("status", "Status", "active", FeatureFieldKind.CHOICE, listOf("active", "paused", "cancelled")),
            field("usage", "Uso", "medium", FeatureFieldKind.CHOICE, listOf("high", "medium", "low")),
            field("paymentPlace", "Onde paga"), field("notes", "Observacao")
        )
        return simpleMoneyModule("subscriptions", "Assinaturas", "Recorrencias e renovacoes", "\uD83D\uDD01", fields, "amount", "renewalDate")
    }

    private fun debtModule(): FeatureModuleUi {
        val fields = listOf(
            field("name", "Divida"), field("totalAmount", "Valor original", kind = FeatureFieldKind.MONEY),
            field("outstandingAmount", "Saldo devedor", kind = FeatureFieldKind.MONEY),
            field("installmentAmount", "Parcela", kind = FeatureFieldKind.MONEY),
            field("remainingInstallments", "Parcelas restantes", kind = FeatureFieldKind.NUMBER),
            field("totalInstallments", "Total de parcelas", kind = FeatureFieldKind.NUMBER),
            field("interestRate", "Juros ao mes", kind = FeatureFieldKind.NUMBER),
            field("nextDueDate", "Proximo vencimento", LocalDate.now().plusMonths(1).toString(), FeatureFieldKind.DATE),
            field("accountId", "Conta ou cartao"),
            field("strategy", "Estrategia", "custom", FeatureFieldKind.CHOICE, listOf("custom", "snowball", "avalanche")),
            field("status", "Status", "active", FeatureFieldKind.CHOICE, listOf("active", "watch", "closed")), field("notes", "Observacao")
        )
        return simpleMoneyModule("debts", "Dividas", "Parcelas e quitacao", "\uD83E\uDDFE", fields, "outstandingAmount", "nextDueDate", "Registrar parcela")
    }

    private fun contractModule(): FeatureModuleUi {
        val fields = listOf(
            field("name", "Contrato"), field("kind", "Tipo"), field("provider", "Fornecedor"),
            field("monthlyAmount", "Valor mensal", kind = FeatureFieldKind.MONEY),
            field("renewalDate", "Renovacao", LocalDate.now().plusYears(1).toString(), FeatureFieldKind.DATE),
            field("adjustmentDate", "Reajuste", LocalDate.now().plusYears(1).toString(), FeatureFieldKind.DATE),
            field("accountId", "Conta ou cartao"),
            field("status", "Status", "active", FeatureFieldKind.CHOICE, listOf("active", "watch", "ended")), field("notes", "Observacao")
        )
        return simpleMoneyModule("contracts", "Contratos", "Servicos e reajustes", "\uD83D\uDCC4", fields, "monthlyAmount", "renewalDate")
    }

    private fun shoppingModule(): FeatureModuleUi {
        val listIds = items(shoppingLists()) { item -> FeatureItemUi(item.optString("id"), item.optString("name"), "", "", "", null, "", emptyList()) }.map { it.id }
        val fields = listOf(
            field("name", "Item"), field("qty", "Quantidade"), field("cat", "Categoria", "Geral"),
            field("listId", "Lista", defaultShoppingListId(), FeatureFieldKind.CHOICE, listIds.ifEmpty { listOf(defaultShoppingListId()) })
        )
        return FeatureModuleUi("shopping", "Compras", "Listas do dia a dia", "\uD83D\uDED2", items(shoppingItems()) { item ->
            featureItem(item, item.optString("name", "Item"), listOf(item.optString("qty"), item.optString("cat")).filter(String::isNotBlank).joinToString(" - "), "",
                if (item.optBoolean("bought")) "\u2705" else "\uD83D\uDED2", fields, status = if (item.optBoolean("bought")) "Comprado" else "Pendente", primary = if (item.optBoolean("bought")) "Desmarcar" else "Comprar")
        }, fields, "Sua lista esta vazia.")
    }

    private fun shoppingListModule(): FeatureModuleUi {
        val fields = listOf(field("name", "Nome da lista"), field("ico", "Icone", "\uD83D\uDED2"))
        return FeatureModuleUi("shopping_lists", "Listas", "Mercado e compras", "\uD83D\uDCCB", items(shoppingLists()) { item ->
            featureItem(item, item.optString("name", "Lista"), "${shoppingItemsFor(item.optString("id"))} itens", "", item.optString("ico", "\uD83D\uDED2"), fields)
        }, fields, "Nenhuma lista criada.")
    }

    private fun sharedModule(balances: Map<String, Double>, canWrite: Boolean): FeatureModuleUi {
        val fields = listOf(
            field("name", "Pessoa"),
            field("permission", "Permissao", "editor", FeatureFieldKind.CHOICE, listOf("editor", "read", "guest")),
            field("color", "Cor", "#0A84FF")
        )
        return FeatureModuleUi("shared", "Compartilhado", "Pessoas, gastos e acertos", "\uD83D\uDC65", items(sharedPeople()) { item ->
            val owner = item.optString("id") == sharedState().optString("ownerPersonId")
            val balance = balances[item.optString("id")] ?: 0.0
            val status = when {
                balance > 0.009 -> "A receber"
                balance < -0.009 -> "A pagar"
                else -> "Em dia"
            }
            val permission = if (owner) "Responsavel" else permissionLabel(item.optString("permission", "editor"))
            featureItem(item, item.optString("name", "Pessoa"), permission, money.format(kotlin.math.abs(balance)), "\uD83D\uDC64", fields,
                status = status, primary = if (owner || !canWrite) "" else "Registrar acerto",
                canEdit = canWrite, canDelete = canWrite && !owner)
        }, fields, "Adicione pessoas ao espaco compartilhado.", canCreate = canWrite)
    }

    private fun sharedSpaceModule(canWrite: Boolean): FeatureModuleUi {
        val root = sharedState()
        val fields = listOf(
            field("name", "Nome do espaco"),
            field("mode", "Modo", "couple", FeatureFieldKind.CHOICE, listOf("couple", "family", "house"))
        )
        val item = FeatureItemUi(
            "shared_space",
            root.optString("name", "Meu espaco").ifBlank { "Meu espaco" },
            when (root.optString("mode", "couple")) { "family" -> "Familia"; "house" -> "Casa"; else -> "Casal" },
            "", "", null, "\uD83E\uDD1D",
            fields.map { it.copy(value = root.optString(it.key, it.value)) },
            if (canWrite) "Compartilhar convite" else "",
            canEdit = canWrite,
            canDelete = false
        )
        return FeatureModuleUi(
            "shared_space", "Espaco compartilhado", "Nome, modo e convite", "\uD83E\uDD1D",
            listOf(item), fields, "Configure o espaco compartilhado.", canCreate = false
        )
    }

    private fun carModule(): FeatureModuleUi {
        val vehicleIds = items(carVehicles()) { item ->
            FeatureItemUi(item.optString("id"), item.optString("name"), "", "", "", null, "", emptyList())
        }.map { it.id }
        val fields = listOf(
            field("type", "Registro", "expense", FeatureFieldKind.CHOICE, listOf("fuel", "expense")),
            field("vehicleId", "Veiculo", defaultVehicleId(), FeatureFieldKind.CHOICE, vehicleIds.ifEmpty { listOf(defaultVehicleId()) }),
            field("title", "Descricao"), field("date", "Data", LocalDate.now().toString(), FeatureFieldKind.DATE),
            field("amount", "Valor", kind = FeatureFieldKind.MONEY), field("odometer", "Hodometro", kind = FeatureFieldKind.NUMBER),
            field("fuelType", "Combustivel", "Gasolina", FeatureFieldKind.CHOICE, listOf("Gasolina", "Etanol", "Diesel", "GNV")),
            field("liters", "Litros", kind = FeatureFieldKind.NUMBER), field("pricePerLiter", "Preco por litro", kind = FeatureFieldKind.MONEY),
            field("accountId", "Conta usada"),
            field("category", "Tipo de despesa", "Maintenance", FeatureFieldKind.CHOICE, listOf("Maintenance", "Insurance", "Tax", "Parking", "Wash", "Fine", "Other")),
            field("note", "Observacao")
        )
        val events = jsonObjects(carEvents())
        val total = events.sumOf { it.optDouble("amount") }
        val efficiencies = vehicleIds.flatMap { vehicleId -> fuelEfficiencies(events.filter { it.optString("vehicleId") == vehicleId }) }
        val average = efficiencies.takeIf { it.isNotEmpty() }?.average() ?: 0.0
        val distance = vehicleIds.sumOf { vehicleId ->
            val odometers = events.filter { it.optString("vehicleId") == vehicleId && it.optDouble("odometer") > 0.0 }
                .map { it.optDouble("odometer") }
            if (odometers.size >= 2) (odometers.maxOrNull() ?: 0.0) - (odometers.minOrNull() ?: 0.0) else 0.0
        }
        val maintenance = events.filter { it.optString("type") == "expense" }
        val maintenanceSpend = maintenance.sumOf { it.optDouble("amount") }
        val latestOil = maintenance.filter {
            val text = "${it.optString("title")} ${it.optString("note")}".lowercase()
            listOf("oleo", "óleo", "filtro", "revis", "troca").any(text::contains)
        }.maxWithOrNull(compareBy<JSONObject> { it.optString("date") }.thenBy { it.optDouble("odometer") })
        val highestOdometer = maxOf(
            events.maxOfOrNull { it.optDouble("odometer") } ?: 0.0,
            jsonObjects(carVehicles()).maxOfOrNull { it.optDouble("odometer") } ?: 0.0
        )
        val nextServiceOdometer = latestOil?.optDouble("odometer", 0.0)?.takeIf { it > 0.0 }?.plus(5_000.0)
        val remainingService = nextServiceOdometer?.minus(highestOdometer)?.coerceAtLeast(0.0)
        val monthly = events.groupBy { runCatching { YearMonth.parse(it.optString("date").take(7)) }.getOrNull() }
            .filterKeys { it != null }
            .mapKeys { it.key!! }
            .mapValues { (_, values) -> values.sumOf { it.optDouble("amount") } }
        val months = (5 downTo 0).map { YearMonth.now().minusMonths(it.toLong()) }
        val maxMonth = months.maxOfOrNull { monthly[it] ?: 0.0 }?.coerceAtLeast(1.0) ?: 1.0
        val subtitle = buildList {
            add(money.format(total))
            if (average > 0.0) add(String.format(Locale.US, "%.1f km/l", average))
        }.joinToString(" - ")
        return FeatureModuleUi("car", "Carro", subtitle, "\uD83D\uDE97", events.map { item ->
            val efficiency = efficiencyFor(item, events)
            val detail = buildList {
                add(item.optString("date"))
                if (item.optDouble("odometer") > 0.0) add("${item.optDouble("odometer").toInt()} km")
            }.joinToString(" - ")
            val status = buildList {
                if (item.optString("type") == "fuel" && item.optDouble("liters") > 0.0) add("${item.optDouble("liters")} L")
                if (efficiency > 0.0) add(String.format(Locale.US, "%.1f km/l", efficiency))
                if (item.optString("note").isNotBlank()) add(item.optString("note"))
            }.joinToString(" - ")
            featureItem(item, item.optString("title", if (item.optString("type") == "fuel") "Abastecimento" else "Despesa"), detail, money.format(item.optDouble("amount")),
                if (item.optString("type") == "fuel") "\u26FD" else "\uD83D\uDD27", fields, status = status)
        }, fields, "Nenhum registro do veiculo.", insights = listOf(
            FeatureInsightUi("Consumo medio", if (average > 0.0) String.format(Locale.US, "%.1f km/l", average) else "Sem dados", "Dois abastecimentos com hodometro"),
            FeatureInsightUi("Custo por km", if (distance > 0.0) money.format(total / distance) else "Sem dados", if (distance > 0.0) "${distance.toInt()} km medidos" else "Informe o hodometro"),
            FeatureInsightUi("Manutencao", money.format(maintenanceSpend), "Seguro, imposto e servicos no historico"),
            FeatureInsightUi("Proxima revisao", remainingService?.let { "${it.toInt()} km" } ?: "Sem previsao", nextServiceOdometer?.let { "Em ${it.toInt()} km" } ?: "Registre troca de oleo ou revisao")
        ), trends = months.map { month ->
            val amount = monthly[month] ?: 0.0
            FeatureTrendUi(
                month.month.getDisplayName(TextStyle.SHORT, Locale.Builder().setLanguage("pt").setRegion("BR").build()).replace(".", "").replaceFirstChar(Char::uppercase),
                money.format(amount),
                (amount / maxMonth).toFloat().coerceIn(0f, 1f)
            )
        })
    }

    private fun vehicleModule(): FeatureModuleUi {
        val fields = listOf(
            field("name", "Nome"), field("plate", "Placa"), field("model", "Modelo e ano"),
            field("odometer", "Hodometro atual", kind = FeatureFieldKind.NUMBER)
        )
        return FeatureModuleUi("vehicles", "Veiculos", "Garagem e hodometro", "\uD83D\uDE99", items(carVehicles()) { item ->
            featureItem(item, item.optString("name", "Veiculo"), listOf(item.optString("plate"), item.optString("model")).filter(String::isNotBlank).joinToString(" - "),
                "${item.optDouble("odometer", 0.0).toInt()} km", "\uD83D\uDE99", fields)
        }, fields, "Nenhum veiculo cadastrado.")
    }

    private fun simpleMoneyModule(id: String, title: String, subtitle: String, emoji: String, fields: List<FeatureFieldUi>, amountKey: String, dateKey: String, primary: String = "") =
        FeatureModuleUi(id, title, subtitle, emoji, items(commitmentArray(id)) { item ->
            featureItem(item, item.optString("name", title), item.optString(dateKey), money.format(item.optDouble(amountKey)), emoji, fields,
                status = item.optString("status"), primary = primary)
        }, fields, "Nenhum item cadastrado.")

    private fun featureItem(
        item: JSONObject,
        title: String,
        subtitle: String,
        value: String,
        emoji: String,
        schema: List<FeatureFieldUi>,
        progress: Float? = null,
        status: String = "",
        primary: String = "",
        canEdit: Boolean = true,
        canDelete: Boolean = true
    ) =
        FeatureItemUi(item.optString("id"), title, subtitle, value, status, progress, emoji,
            schema.map { field ->
                val value = if (field.key == "permission" && item.optString("id") == sharedState().optString("ownerPersonId")) "owner"
                    else item.optString(field.key, field.value)
                field.copy(value = value)
            }, primary, "", canEdit, canDelete)

    private fun field(key: String, label: String, value: String = "", kind: FeatureFieldKind = FeatureFieldKind.TEXT, options: List<String> = emptyList()) =
        FeatureFieldUi(key, label, value, kind, options)

    private fun items(array: JSONArray, map: (JSONObject) -> FeatureItemUi): List<FeatureItemUi> = buildList {
        for (index in 0 until array.length()) array.optJSONObject(index)?.let { add(map(it)) }
    }

    private fun jsonObjects(array: JSONArray): List<JSONObject> = buildList {
        for (index in 0 until array.length()) array.optJSONObject(index)?.let(::add)
    }

    private fun arrayKey(key: String) = runCatching { JSONArray(prefs.getString(key, "[]")) }.getOrDefault(JSONArray())
    private fun commitments() = runCatching { JSONObject(prefs.getString("feature_commitments", "{}") ?: "{}") }.getOrDefault(JSONObject())
    private fun commitmentArray(key: String) = commitments().optJSONArray(key) ?: JSONArray()
    private fun shopping() = runCatching { JSONObject(prefs.getString("feature_shopping", "{}") ?: "{}") }.getOrDefault(JSONObject())
    private fun shoppingItems() = shopping().optJSONArray("items") ?: JSONArray()
    private fun shoppingLists() = shopping().optJSONArray("lists") ?: JSONArray()
    private fun car() = runCatching { JSONObject(prefs.getString("feature_car", "{}") ?: "{}") }.getOrDefault(JSONObject())
    private fun carEvents() = car().optJSONArray("events") ?: JSONArray()
    private fun carVehicles() = car().optJSONArray("vehicles") ?: JSONArray()
    private fun sharedState() = normalizeShared(runCatching { JSONObject(prefs.getString("feature_shared", "{}") ?: "{}") }.getOrDefault(JSONObject()))
    private fun sharedPeople() = sharedState().optJSONArray("people") ?: JSONArray()
    private fun queue() = runCatching { JSONArray(prefs.getString(KEY_QUEUE, "[]")) }.getOrDefault(JSONArray())

    private fun persistTarget(moduleId: String, target: JSONArray) {
        when (moduleId) {
            "budgets" -> prefs.edit().putString("feature_budgets", target.toString()).apply()
            "goals" -> prefs.edit().putString("feature_goals", target.toString()).apply()
            "subscriptions", "debts", "contracts" -> {
                val root = commitments().put(moduleId, target)
                prefs.edit().putString("feature_commitments", root.toString()).apply()
            }
            "shopping" -> {
                val root = shopping().put("items", target)
                if (!root.has("lists")) root.put("lists", JSONArray().put(JSONObject().put("id", defaultShoppingListId()).put("name", "Mercado").put("ico", "\uD83D\uDED2")))
                prefs.edit().putString("feature_shopping", root.toString()).apply()
            }
            "shopping_lists" -> {
                val root = shopping().put("lists", target)
                if (!root.has("items")) root.put("items", JSONArray())
                prefs.edit().putString("feature_shopping", root.toString()).apply()
            }
            "shared" -> {
                val root = sharedState().put("people", target)
                if (!root.has("mode")) root.put("mode", "couple")
                if (!root.has("ownerPersonId") && target.length() > 0) root.put("ownerPersonId", target.optJSONObject(0)?.optString("id"))
                prefs.edit().putString("feature_shared", normalizeShared(root).toString()).apply()
            }
            "vehicles" -> {
                val root = car().put("vehicles", target)
                if (!root.has("events")) root.put("events", JSONArray())
                if (!root.has("activeVehicleId") && target.length() > 0) root.put("activeVehicleId", target.optJSONObject(0)?.optString("id"))
                prefs.edit().putString("feature_car", root.toString()).apply()
            }
            "car" -> {
                val root = car().put("events", target)
                if (!root.has("vehicles")) root.put("vehicles", JSONArray().put(JSONObject().put("id", defaultVehicleId()).put("name", "Meu carro")))
                prefs.edit().putString("feature_car", root.toString()).apply()
            }
        }
    }

    private fun upsert(array: JSONArray, item: JSONObject) {
        val index = indexOf(array, item.optString("id"))
        if (index >= 0) array.put(index, item) else array.put(item)
    }

    private fun remove(array: JSONArray, id: String) {
        val index = indexOf(array, id)
        if (index >= 0) array.remove(index)
    }

    private fun indexOf(array: JSONArray, id: String): Int {
        for (index in 0 until array.length()) if (array.optJSONObject(index)?.optString("id") == id) return index
        return -1
    }

    private fun localId(prefix: String) = "android_${prefix}_${UUID.randomUUID()}"
    private fun decimal(raw: String): Double {
        val clean = raw.replace("R$", "").replace(" ", "").trim()
        val normalized = when {
            clean.contains(',') -> clean.replace(".", "").replace(',', '.')
            else -> clean
        }
        return normalized.toDoubleOrNull() ?: 0.0
    }

    private fun validItem(moduleId: String, item: JSONObject): Boolean = when (moduleId) {
        "budgets" -> item.optString("category").isNotBlank() && item.optDouble("limit") > 0.0
        "goals" -> item.optString("name").isNotBlank() && item.optDouble("target") > 0.0 && runCatching { LocalDate.parse(item.optString("deadline")) }.isSuccess
        "subscriptions" -> item.optString("name").isNotBlank() && item.optDouble("amount") >= 0.0 && item.optInt("billingDay") in 1..31
        "debts" -> item.optString("name").isNotBlank() && item.optDouble("outstandingAmount") >= 0.0 && item.optInt("totalInstallments") > 0
        "contracts" -> item.optString("name").isNotBlank() && item.optDouble("monthlyAmount") >= 0.0
        "shopping_lists", "shopping", "shared", "vehicles" -> item.optString("name").isNotBlank()
        "car" -> item.optString("vehicleId").isNotBlank() && item.optDouble("amount") > 0.0 && runCatching { LocalDate.parse(item.optString("date")) }.isSuccess
        else -> true
    }
    private fun defaultShoppingListId() = shopping().optJSONArray("lists")?.optJSONObject(0)?.optString("id")?.ifBlank { null } ?: "android_market"
    private fun shoppingItemsFor(listId: String): Int {
        var count = 0
        val source = shoppingItems()
        for (index in 0 until source.length()) {
            val item = source.optJSONObject(index) ?: continue
            if (item.optString("listId", item.optString("list_id", "")) == listId) count++
        }
        return count
    }
    private fun defaultVehicleId() = car().optJSONArray("vehicles")?.optJSONObject(0)?.optString("id")?.ifBlank { null } ?: "android_vehicle"

    private fun updateVehicleOdometer(event: JSONObject) {
        val odometer = event.optDouble("odometer", 0.0)
        if (odometer <= 0.0) return
        val root = car()
        val vehicles = root.optJSONArray("vehicles") ?: return
        val index = indexOf(vehicles, event.optString("vehicleId"))
        if (index < 0) return
        val vehicle = vehicles.optJSONObject(index) ?: return
        if (odometer > vehicle.optDouble("odometer", 0.0)) vehicle.put("odometer", odometer)
        root.put("vehicles", vehicles)
        prefs.edit().putString("feature_car", root.toString()).apply()
    }

    private fun fuelEfficiencies(events: List<JSONObject>): List<Double> {
        val fuels = events.filter { it.optString("type") == "fuel" && it.optDouble("liters") > 0.0 && it.optDouble("odometer") > 0.0 }
            .sortedWith(compareBy<JSONObject> { it.optDouble("odometer") }.thenBy { it.optString("date") })
        return fuels.zipWithNext().mapNotNull { (start, end) ->
            val distance = end.optDouble("odometer") - start.optDouble("odometer")
            val liters = end.optDouble("liters")
            (distance / liters).takeIf { distance > 0.0 && liters > 0.0 && it.isFinite() }
        }
    }

    private fun efficiencyFor(event: JSONObject, events: List<JSONObject>): Double {
        if (event.optString("type") != "fuel" || event.optDouble("liters") <= 0.0 || event.optDouble("odometer") <= 0.0) return 0.0
        val previous = events.filter {
            it.optString("vehicleId") == event.optString("vehicleId") &&
                it.optString("type") == "fuel" && it.optDouble("odometer") > 0.0 && it.optDouble("odometer") < event.optDouble("odometer")
        }.maxByOrNull { it.optDouble("odometer") } ?: return 0.0
        return ((event.optDouble("odometer") - previous.optDouble("odometer")) / event.optDouble("liters")).takeIf(Double::isFinite) ?: 0.0
    }

    private fun advanceDate(raw: String, months: Long): String = runCatching {
        LocalDate.parse(raw).plusMonths(months).toString()
    }.getOrDefault(LocalDate.now().plusMonths(months).toString())

    private fun remoteShared(state: JSONObject): JSONObject {
        val settings = state.optJSONObject("settings") ?: JSONObject()
        val rates = settings.optJSONObject("rates") ?: JSONObject()
        return settings.optJSONObject("sharedSpace") ?: settings.optJSONObject("shared_space")
            ?: rates.optJSONObject("sharedSpace") ?: rates.optJSONObject("shared_space") ?: JSONObject()
    }

    private fun normalizeShared(source: JSONObject): JSONObject {
        val peopleSource = source.optJSONArray("people") ?: JSONArray()
        val people = JSONArray()
        val seen = mutableSetOf<String>()
        var ownerId = source.optString("ownerPersonId", source.optString("owner_person_id"))
        for (index in 0 until peopleSource.length()) {
            val raw = peopleSource.optJSONObject(index) ?: continue
            val name = raw.optString("name").trim()
            if (name.isBlank() || !seen.add(name.lowercase(Locale.ROOT))) continue
            val id = raw.optString("id").ifBlank { localId("person") }
            if (ownerId.isBlank() && people.length() == 0) ownerId = id
            people.put(JSONObject(raw.toString())
                .put("id", id)
                .put("name", name)
                .put("color", raw.optString("color", "#0A84FF"))
                .put("permission", if (id == ownerId) "owner" else normalizePermission(raw.optString("permission", raw.optString("role", "editor")))))
        }
        if (people.length() == 0) {
            ownerId = "android_owner"
            people.put(JSONObject()
                .put("id", ownerId)
                .put("name", prefs.getString("user_name", "Voce")?.ifBlank { "Voce" } ?: "Voce")
                .put("color", "#0A84FF")
                .put("permission", "owner"))
        }
        if ((0 until people.length()).none { people.optJSONObject(it)?.optString("id") == ownerId }) {
            ownerId = people.optJSONObject(0)?.optString("id").orEmpty()
        }
        for (index in 0 until people.length()) {
            val person = people.optJSONObject(index) ?: continue
            person.put("permission", if (person.optString("id") == ownerId) "owner" else normalizePermission(person.optString("permission")))
        }
        return JSONObject(source.toString())
            .put("mode", source.optString("mode", "couple").takeIf { it in setOf("couple", "family", "house") } ?: "couple")
            .put("name", source.optString("name", "Meu espaco").ifBlank { "Meu espaco" })
            .put("ownerPersonId", ownerId)
            .put("people", people)
    }

    private fun normalizePermission(raw: String): String = raw.takeIf { it in setOf("editor", "read", "guest") } ?: "editor"

    private fun permissionLabel(raw: String): String = when (normalizePermission(raw)) {
        "read" -> "Somente leitura"
        "guest" -> "Convidado"
        else -> "Pode editar"
    }

    private fun remoteCommitments(state: JSONObject): JSONObject {
        val settings = state.optJSONObject("settings") ?: JSONObject()
        return settings.optJSONObject("commitments") ?: settings.optJSONObject("commitmentCenter") ?: JSONObject()
    }

    private fun importArray(key: String, incoming: JSONArray, merge: Boolean) {
        if (!merge) {
            prefs.edit().putString(key, incoming.toString()).apply()
            return
        }
        val current = arrayKey(key)
        for (index in 0 until incoming.length()) {
            val item = incoming.optJSONObject(index) ?: continue
            if (indexOf(current, item.optString("id")) < 0) current.put(item)
        }
        prefs.edit().putString(key, current.toString()).apply()
    }

    private fun importObject(key: String, incoming: JSONObject, merge: Boolean, arrayNames: List<String>) {
        if (!merge) {
            prefs.edit().putString(key, incoming.toString()).apply()
            return
        }
        val current = runCatching { JSONObject(prefs.getString(key, "{}") ?: "{}") }.getOrDefault(JSONObject())
        arrayNames.forEach { arrayName ->
            val merged = current.optJSONArray(arrayName) ?: JSONArray()
            val source = incoming.optJSONArray(arrayName) ?: JSONArray()
            for (index in 0 until source.length()) {
                val item = source.optJSONObject(index) ?: continue
                if (indexOf(merged, item.optString("id")) < 0) merged.put(item)
            }
            current.put(arrayName, merged)
        }
        if (incoming.has("activeVehicleId") && !current.has("activeVehicleId")) {
            current.put("activeVehicleId", incoming.optString("activeVehicleId"))
        }
        prefs.edit().putString(key, current.toString()).apply()
    }

    private fun normalizeBudgets(source: JSONArray) = mapArray(source) { item ->
        JSONObject(item.toString())
            .put("category", item.optString("category", "A classificar"))
            .put("limit", item.optDouble("limit", 0.0))
    }

    private fun normalizeGoals(source: JSONArray) = mapArray(source) { item ->
        JSONObject(item.toString())
            .put("name", item.optString("name", "Meta"))
            .put("target", item.optDouble("target", 0.0))
            .put("current", item.optDouble("current", 0.0))
            .put("deadline", item.optString("deadline").take(10))
            .put("desc", item.optString("description", item.optString("desc", "")))
            .put("monthly", item.optDouble("monthly", 0.0))
    }

    private fun normalizeShopping(source: JSONObject): JSONObject = JSONObject().apply {
        put("lists", mapArray(source.optJSONArray("lists") ?: JSONArray()) { item ->
            JSONObject(item.toString())
                .put("id", item.optString("id"))
                .put("name", item.optString("name", "Lista"))
                .put("ico", item.optString("icon", item.optString("ico", "")))
                .put("position", item.optInt("position", 0))
        })
        put("items", mapArray(source.optJSONArray("items") ?: JSONArray()) { item ->
            JSONObject(item.toString())
                .put("id", item.optString("id"))
                .put("listId", item.optString("list_id", item.optString("listId", "")))
                .put("name", item.optString("name", "Item"))
                .put("qty", item.optString("qty", ""))
                .put("cat", item.optString("category", item.optString("cat", "Geral")))
                .put("bought", item.optBoolean("bought", false))
                .put("createdAt", item.optLong("created_ms", item.optLong("createdAt", System.currentTimeMillis())))
        })
    }

    private fun normalizeCar(source: JSONObject): JSONObject {
        val vehicles = mapArray(source.optJSONArray("vehicles") ?: JSONArray()) { item ->
            JSONObject(item.toString())
                .put("id", item.optString("id"))
                .put("name", item.optString("name", "Meu carro"))
                .put("plate", item.optString("plate", ""))
                .put("model", item.optString("model", ""))
                .put("odometer", item.optDouble("odometer", 0.0))
        }
        val fallbackVehicleId = vehicles.optJSONObject(0)?.optString("id").orEmpty().ifBlank { "android_vehicle" }
        val events = mapArray(source.optJSONArray("events") ?: JSONArray()) { item ->
            val liters = item.optDouble("liters", 0.0)
            val price = item.optDouble("price_per_liter", item.optDouble("pricePerLiter", 0.0))
            JSONObject(item.toString())
                .put("id", item.optString("id"))
                .put("vehicleId", item.optString("vehicle_id", item.optString("vehicleId", fallbackVehicleId)))
                .put("type", if (item.optString("type") == "fuel") "fuel" else "expense")
                .put("date", item.optString("date", LocalDate.now().toString()).take(10))
                .put("odometer", item.optDouble("odometer", 0.0))
                .put("fuelType", item.optString("fuel_type", item.optString("fuelType", "Gasolina")))
                .put("liters", liters)
                .put("pricePerLiter", price)
                .put("amount", item.optDouble("amount", liters * price))
                .put("title", item.optString("title", ""))
                .put("category", item.optString("category", "Combustivel"))
                .put("note", item.optString("note", ""))
                .put("accountId", item.optString("account_id", item.optString("accountId", "")))
                .put("txId", item.optString("tx_id", item.optString("txId", "")))
                .put("createdAt", item.optLong("created_at", item.optLong("createdAt", System.currentTimeMillis())))
        }
        return JSONObject().put("vehicles", vehicles).put("events", events).put(
            "activeVehicleId",
            source.optString("active_vehicle_id", source.optString("activeVehicleId", fallbackVehicleId))
        )
    }

    private fun normalizeCommitments(source: JSONObject): JSONObject = JSONObject().apply {
        put("subscriptions", mapArray(source.optJSONArray("subscriptions") ?: JSONArray()) { item -> normalizeAliases(item, mapOf(
            "billingDay" to "billing_day", "renewalDate" to "renewal_date", "paymentMethod" to "payment_method",
            "paymentPlace" to "payment_place", "accountId" to "account_id", "linkedDueId" to "linked_due_id"
        )) })
        put("debts", mapArray(source.optJSONArray("debts") ?: JSONArray()) { item -> normalizeAliases(item, mapOf(
            "totalAmount" to "total_amount", "outstandingAmount" to "outstanding_amount", "installmentAmount" to "installment_amount",
            "totalInstallments" to "total_installments", "remainingInstallments" to "remaining_installments",
            "interestRate" to "interest_rate", "nextDueDate" to "next_due_date", "accountId" to "account_id", "linkedDueId" to "linked_due_id"
        )) })
        put("contracts", mapArray(source.optJSONArray("contracts") ?: JSONArray()) { item -> normalizeAliases(item, mapOf(
            "monthlyAmount" to "monthly_amount", "renewalDate" to "renewal_date", "adjustmentDate" to "adjustment_date",
            "accountId" to "account_id", "linkedDueId" to "linked_due_id"
        )) })
    }

    private fun normalizeAliases(item: JSONObject, aliases: Map<String, String>): JSONObject = JSONObject(item.toString()).apply {
        aliases.forEach { (canonical, legacy) -> if (!has(canonical) && item.has(legacy)) put(canonical, item.opt(legacy)) }
    }

    private fun mapArray(source: JSONArray, transform: (JSONObject) -> JSONObject): JSONArray = JSONArray().apply {
        for (index in 0 until source.length()) source.optJSONObject(index)?.let { put(transform(it)) }
    }

    companion object {
        private val COMMITMENT_MODULES = setOf("subscriptions", "debts", "contracts")
        private val STATE_MODULES = COMMITMENT_MODULES + setOf("shopping", "shopping_lists", "shared", "shared_space", "vehicles", "car")
        private const val STATE_QUEUE_KEY = "feature_state"
        private const val KEY_QUEUE = "feature_sync_queue"
    }
}

