package com.painelure.app

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class FinanzaApiClient(private val prefs: SharedPreferences) {
    val hasCredentials: Boolean
        get() = prefs.getBoolean("online_mode", false) &&
            !prefs.getString("api_url", "").isNullOrBlank() &&
            !prefs.getString("api_key", "").isNullOrBlank()

    val isConfigured: Boolean
        get() = hasCredentials && !prefs.getBoolean("session_expired", false)

    fun requestJson(method: String, path: String, body: JSONObject? = null): JSONObject {
        val baseUrl = prefs.getString("api_url", "")?.removeSuffix("/").orEmpty()
        check(baseUrl.isNotBlank()) { "Servidor do Finanza nao configurado." }
        return try {
            executeJson(method, baseUrl + path, prefs.getString("api_key", "").orEmpty(), body)
        } catch (error: FinanzaAuthenticationException) {
            markAuthenticationExpired(prefs, error.message.orEmpty())
            throw error
        }
    }

    companion object {
        fun checkHealth(baseUrl: String) {
            executeJson("GET", "${baseUrl.removeSuffix("/")}/health", "", null)
        }

        fun login(baseUrl: String, username: String, password: String, otp: String): JSONObject {
            val payload = JSONObject().apply {
                put("username", username)
                put("password", password)
                if (otp.isNotBlank()) put("otp", otp)
            }
            return executeJson("POST", "${baseUrl.removeSuffix("/")}/api/login", "", payload)
        }

        fun verifySession(baseUrl: String, apiKey: String): JSONObject {
            require(apiKey.isNotBlank()) { "O servidor nao retornou uma chave de acesso." }
            return executeJson("GET", "${baseUrl.removeSuffix("/")}/api/me", apiKey, null)
        }

        fun quickExpensePayload(
            amount: Double,
            title: String,
            category: String,
            accountId: String,
            date: String
        ): JSONObject = JSONObject().apply {
            put("type", "expense")
            put("description", title)
            put("amount", amount)
            put("category", category)
            put("date", date)
            put("note", "")
            put("paid", false)
            put("pending", true)
            if (accountId.isNotBlank()) put("account_id", accountId)
        }

        private fun executeJson(
            method: String,
            url: String,
            apiKey: String,
            body: JSONObject?
        ): JSONObject {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 10_000
                readTimeout = 10_000
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                if (apiKey.isNotBlank()) setRequestProperty("x-api-key", apiKey)
                if (body != null) doOutput = true
            }
            return try {
                if (body != null) {
                    connection.outputStream.use { output ->
                        output.write(body.toString().toByteArray(Charsets.UTF_8))
                    }
                }
                val status = connection.responseCode
                val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)
                    ?.bufferedReader()?.use { it.readText() }.orEmpty()
                if (status !in 200..299) {
                    val message = runCatching { JSONObject(raw).optString("error") }.getOrNull()
                        .orEmpty().ifBlank { if (raw.isBlank()) "Falha HTTP $status" else raw }
                    throw finanzaApiException(status, message)
                }
                when {
                    raw.isBlank() -> JSONObject()
                    else -> runCatching { JSONObject(raw) }
                        .getOrElse { JSONObject().put("data", JSONArray(raw)) }
                }
            } finally {
                connection.disconnect()
            }
        }
    }
}

open class FinanzaApiException(val statusCode: Int, message: String) : IllegalStateException(message)
class FinanzaAuthenticationException(message: String) : FinanzaApiException(HttpURLConnection.HTTP_UNAUTHORIZED, message)

internal fun finanzaApiException(status: Int, message: String): FinanzaApiException =
    if (status == HttpURLConnection.HTTP_UNAUTHORIZED) {
        FinanzaAuthenticationException(message.ifBlank { "Sessao expirada. Entre novamente." })
    } else {
        FinanzaApiException(status, message.ifBlank { "Falha HTTP $status" })
    }

internal fun markAuthenticationExpired(prefs: SharedPreferences, message: String) {
    prefs.edit()
        .putBoolean("session_expired", true)
        .putString("last_sync_error", message.ifBlank { "Sessao expirada. Entre novamente." })
        .apply()
}

object FinanzaSyncQueue {
    private const val KEY = "core_sync_queue"

    @Synchronized
    fun enqueueRequest(
        prefs: SharedPreferences,
        method: String,
        path: String,
        body: JSONObject? = null,
        localId: Long? = null
    ) {
        val queue = runCatching { JSONArray(prefs.getString(KEY, "[]")) }.getOrDefault(JSONArray())
        queue.put(JSONObject().apply {
            put("method", method)
            put("path", path)
            put("body", body ?: JSONObject.NULL)
            if (localId != null) put("localId", localId)
            put("createdAt", System.currentTimeMillis())
        })
        prefs.edit().putString(KEY, queue.toString()).apply()
    }

    @Synchronized
    fun enqueueLegacy(prefs: SharedPreferences, mutation: JSONObject) {
        val queue = runCatching { JSONArray(prefs.getString(KEY, "[]")) }.getOrDefault(JSONArray())
        queue.put(mutation)
        prefs.edit().putString(KEY, queue.toString()).apply()
    }

    @Synchronized
    fun enqueueSingleton(prefs: SharedPreferences, queueKey: String, mutation: JSONObject) {
        val queue = runCatching { JSONArray(prefs.getString(KEY, "[]")) }.getOrDefault(JSONArray())
        val updated = JSONArray()
        for (index in 0 until queue.length()) {
            val item = queue.optJSONObject(index) ?: continue
            if (item.optString("queueKey") != queueKey) updated.put(item)
        }
        mutation.put("queueKey", queueKey).put("createdAt", System.currentTimeMillis())
        updated.put(mutation)
        prefs.edit().putString(KEY, updated.toString()).apply()
    }

    fun pendingCount(prefs: SharedPreferences): Int =
        runCatching { JSONArray(prefs.getString(KEY, "[]")).length() }.getOrDefault(0)

    @Synchronized
    fun cancelPendingCreate(prefs: SharedPreferences, localId: Long): Boolean {
        val queue = runCatching { JSONArray(prefs.getString(KEY, "[]")) }.getOrDefault(JSONArray())
        val remaining = JSONArray()
        var removed = false
        for (index in 0 until queue.length()) {
            val item = queue.optJSONObject(index) ?: continue
            val isGenericCreate = item.optString("method") == "POST" &&
                item.optString("path") == FinanzaApiRoutes.TRANSACTIONS &&
                item.optLong("localId", Long.MIN_VALUE) == localId
            val isLegacyCreate = item.optString("mode") == "create" &&
                item.optJSONObject("entry")?.optLong("id", Long.MIN_VALUE) == localId
            if (isGenericCreate || isLegacyCreate) removed = true else remaining.put(item)
        }
        if (removed) prefs.edit().putString(KEY, remaining.toString()).apply()
        return removed
    }
}

