package com.painelure.app

import org.json.JSONArray
import org.json.JSONObject

internal object FinanzaAccountRoutes {
    const val ME = "/api/me"
    const val RECOVERY_CODE = "/api/me/recovery-code"
    const val TWO_FACTOR_SETUP = "/api/me/2fa/setup"
    const val TWO_FACTOR_CONFIRM = "/api/me/2fa/confirm"
    const val TWO_FACTOR = "/api/me/2fa"
    const val PASSWORD_RESET = "/api/password-reset"
    const val PASSWORD_RESET_RECOVERY = "/api/password-reset/recovery"
    const val USERS = "/api/users"
    const val ADMIN_OVERVIEW = "/api/admin/overview"
    const val AUDIT_LOG = "/api/audit-log"

    fun userRole(id: String) = "$USERS/$id/role"
    fun user(id: String) = "$USERS/$id"
    fun audit(limit: Int) = "$AUDIT_LOG?limit=$limit"
}

internal object FinanzaAccountRules {
    val roles = listOf("admin", "editor", "read", "guest")

    fun canWrite(role: String): Boolean = role in setOf("admin", "owner", "editor")
    fun canAdmin(role: String): Boolean = role == "admin"
    fun validPassword(password: String): Boolean = password.length >= 8
    fun validOtp(code: String): Boolean = code.length == 6 && code.all(Char::isDigit)
}

internal class FinanzaAccountRepository(private val transport: FinanzaJsonTransport) {
    constructor(client: FinanzaApiClient) : this(FinanzaJsonTransport { method, path, body ->
        client.requestJson(method, path, body)
    })

    fun profile(): JSONObject = transport.request("GET", FinanzaAccountRoutes.ME, null)

    fun recoveryCode(): String {
        val result = transport.request("POST", FinanzaAccountRoutes.RECOVERY_CODE, null)
        return result.optString("recovery_code", result.optString("code"))
            .ifBlank { throw IllegalStateException("O servidor nao retornou o codigo de recuperacao.") }
    }

    fun beginTwoFactor(): JSONObject = transport.request("POST", FinanzaAccountRoutes.TWO_FACTOR_SETUP, null)

    fun confirmTwoFactor(code: String): JSONObject {
        require(FinanzaAccountRules.validOtp(code)) { "Informe os 6 digitos do autenticador." }
        return transport.request("POST", FinanzaAccountRoutes.TWO_FACTOR_CONFIRM, JSONObject().put("code", code))
    }

    fun disableTwoFactor(code: String): JSONObject {
        require(FinanzaAccountRules.validOtp(code)) { "Informe os 6 digitos do autenticador." }
        return transport.request("DELETE", FinanzaAccountRoutes.TWO_FACTOR, JSONObject().put("code", code))
    }

    fun resetPasswordWithRecovery(username: String, password: String, recoveryCode: String): JSONObject {
        require(username.isNotBlank()) { "Informe o usuario." }
        require(FinanzaAccountRules.validPassword(password)) { "A senha deve ter pelo menos 8 caracteres." }
        require(recoveryCode.isNotBlank()) { "Informe o codigo de recuperacao." }
        return transport.request("POST", FinanzaAccountRoutes.PASSWORD_RESET_RECOVERY, JSONObject()
            .put("username", username.trim())
            .put("password", password)
            .put("recovery_code", recoveryCode.trim()))
    }

    fun adminOverview(): JSONObject = transport.request("GET", FinanzaAccountRoutes.ADMIN_OVERVIEW, null)

    fun users(): JSONArray = transport.request("GET", FinanzaAccountRoutes.USERS, null).optJSONArray("data") ?: JSONArray()

    fun audit(limit: Int = 30): JSONArray =
        transport.request("GET", FinanzaAccountRoutes.audit(limit.coerceIn(1, 100)), null).optJSONArray("data") ?: JSONArray()

    fun createUser(name: String, username: String, password: String, role: String): JSONObject {
        require(username.isNotBlank()) { "Informe o usuario." }
        require(FinanzaAccountRules.validPassword(password)) { "A senha deve ter pelo menos 8 caracteres." }
        require(role in FinanzaAccountRules.roles) { "Perfil de acesso invalido." }
        return transport.request("POST", FinanzaAccountRoutes.USERS, JSONObject()
            .put("name", name.trim().ifBlank { username.trim() })
            .put("username", username.trim())
            .put("password", password)
            .put("role", role))
    }

    fun updateUserRole(id: String, currentUserId: String, role: String): JSONObject {
        require(id.isNotBlank() && id != currentUserId) { "Use outra conta admin para alterar seu proprio papel." }
        require(role in FinanzaAccountRules.roles) { "Perfil de acesso invalido." }
        return transport.request("PATCH", FinanzaAccountRoutes.userRole(id), JSONObject().put("role", role))
    }

    fun deleteUser(id: String, currentUserId: String) {
        require(id.isNotBlank() && id != currentUserId) { "Use outra conta admin para remover esta conta." }
        transport.request("DELETE", FinanzaAccountRoutes.user(id), null)
    }
}

