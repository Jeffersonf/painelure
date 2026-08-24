package com.painelure.app

import org.json.JSONObject

internal data class FinanzaSharedTransaction(
    val type: String,
    val amount: Double,
    val splitMeta: String
)

internal object FinanzaSharedRules {
    fun balances(space: JSONObject, transactions: List<FinanzaSharedTransaction>): Map<String, Double> {
        val people = space.optJSONArray("people")
        val ownerId = space.optString("ownerPersonId", people?.optJSONObject(0)?.optString("id").orEmpty())
        if (ownerId.isBlank() || people == null) return emptyMap()
        val balances = buildMap<String, Double> {
            for (index in 0 until people.length()) {
                val id = people.optJSONObject(index)?.optString("id").orEmpty()
                if (id.isNotBlank() && id != ownerId) put(id, 0.0)
            }
        }.toMutableMap()

        transactions.forEach { transaction ->
            val meta = runCatching { JSONObject(transaction.splitMeta) }.getOrNull() ?: return@forEach
            when (meta.optString("kind")) {
                "equal" -> applyEqualSplit(ownerId, balances, transaction, meta)
                "settlement" -> applySettlement(ownerId, balances, transaction.amount, meta)
            }
        }
        return balances
    }

    private fun applyEqualSplit(
        ownerId: String,
        balances: MutableMap<String, Double>,
        transaction: FinanzaSharedTransaction,
        meta: JSONObject
    ) {
        if (transaction.type != "expense" || transaction.amount <= 0.0) return
        val approval = meta.optJSONObject("approval")?.optString("status").orEmpty()
        if (approval.isNotBlank() && approval != "approved") return
        val rawParticipants = meta.optJSONArray("participants") ?: return
        val participants = buildSet {
            for (index in 0 until rawParticipants.length()) {
                rawParticipants.optString(index).takeIf(String::isNotBlank)?.let(::add)
            }
        }
        if (participants.size < 2) return
        val payerId = meta.optString("payerId", ownerId)
        val share = transaction.amount / participants.size
        if (payerId == ownerId) {
            participants.filter { it != ownerId && balances.containsKey(it) }.forEach { id ->
                balances[id] = balances.getValue(id) + share
            }
        } else if (ownerId in participants && balances.containsKey(payerId)) {
            balances[payerId] = balances.getValue(payerId) - share
        }
    }

    private fun applySettlement(ownerId: String, balances: MutableMap<String, Double>, amount: Double, meta: JSONObject) {
        if (amount <= 0.0) return
        val fromId = meta.optString("fromPersonId")
        val toId = meta.optString("toPersonId")
        if (fromId == ownerId && balances.containsKey(toId)) balances[toId] = balances.getValue(toId) + amount
        if (toId == ownerId && balances.containsKey(fromId)) balances[fromId] = balances.getValue(fromId) - amount
    }
}

