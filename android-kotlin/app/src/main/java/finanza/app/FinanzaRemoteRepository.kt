package com.painelure.app

import org.json.JSONArray
import org.json.JSONObject

internal object FinanzaApiRoutes {
    const val TRANSACTIONS = "/api/transactions"
    const val BUDGETS = "/api/budgets"
    const val GOALS = "/api/goals"
    const val STATE = "/api/state"
    const val IMPORT = "/api/import"

    fun transactions(limit: Int): String = "$TRANSACTIONS?limit=$limit"
    fun transaction(id: Long): String = "$TRANSACTIONS/$id"
    fun budget(id: String): String = "$BUDGETS/$id"
    fun goal(id: String): String = "$GOALS/$id"
    fun goalContribution(id: String): String = "${goal(id)}/add"
}

internal fun interface FinanzaJsonTransport {
    fun request(method: String, path: String, body: JSONObject?): JSONObject
}

internal data class FinanzaRemoteSnapshot(
    val transactions: JSONArray,
    val budgets: JSONArray,
    val goals: JSONArray,
    val state: JSONObject
)

internal class FinanzaRemoteRepository(
    private val transport: FinanzaJsonTransport
) {
    constructor(client: FinanzaApiClient) : this(
        FinanzaJsonTransport { method, path, body -> client.requestJson(method, path, body) }
    )

    fun loadSnapshot(transactionLimit: Int = 1_000): FinanzaRemoteSnapshot = FinanzaRemoteSnapshot(
        transactions = transport.request("GET", FinanzaApiRoutes.transactions(transactionLimit), null)
            .optJSONArray("data") ?: JSONArray(),
        budgets = transport.request("GET", FinanzaApiRoutes.BUDGETS, null)
            .optJSONArray("data") ?: JSONArray(),
        goals = transport.request("GET", FinanzaApiRoutes.GOALS, null)
            .optJSONArray("data") ?: JSONArray(),
        state = loadState()
    )

    fun createTransaction(payload: JSONObject): JSONObject =
        transport.request("POST", FinanzaApiRoutes.TRANSACTIONS, payload)

    fun updateTransaction(id: Long, payload: JSONObject): JSONObject =
        transport.request("PUT", FinanzaApiRoutes.transaction(id), payload)

    fun deleteTransaction(id: Long) {
        transport.request("DELETE", FinanzaApiRoutes.transaction(id), null)
    }

    fun createBudget(payload: JSONObject): JSONObject = transport.request("POST", FinanzaApiRoutes.BUDGETS, payload)

    fun deleteBudget(id: String) {
        transport.request("DELETE", FinanzaApiRoutes.budget(id), null)
    }

    fun createGoal(payload: JSONObject): JSONObject = transport.request("POST", FinanzaApiRoutes.GOALS, payload)

    fun addGoalContribution(id: String, amount: Double): JSONObject =
        transport.request("PATCH", FinanzaApiRoutes.goalContribution(id), JSONObject().put("amount", amount))

    fun deleteGoal(id: String) {
        transport.request("DELETE", FinanzaApiRoutes.goal(id), null)
    }

    fun importBackup(payload: JSONObject): JSONObject = transport.request("PUT", FinanzaApiRoutes.IMPORT, payload)

    fun loadState(): JSONObject = transport.request("GET", FinanzaApiRoutes.STATE, null)

    fun saveState(state: JSONObject): JSONObject =
        transport.request("PUT", FinanzaApiRoutes.STATE, state)

    fun updateState(change: (JSONObject) -> Unit): JSONObject {
        val state = JSONObject(loadState().toString())
        change(state)
        return saveState(state)
    }
}

