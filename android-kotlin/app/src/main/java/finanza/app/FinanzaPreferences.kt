package com.painelure.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

internal object FinanzaPreferences {
    const val NAME = "finanza_native"

    fun get(context: Context): SharedPreferences =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun repairLegacyTypes(context: Context) {
        val prefs = get(context)
        val values = prefs.all
        val editor = prefs.edit()
        var changed = false

        fun normalizeString(key: String) {
            val value = values[key] ?: return
            if (value !is String) {
                editor.putString(key, value.toString())
                changed = true
            }
        }

        fun normalizeBoolean(key: String, default: Boolean = false) {
            val value = values[key] ?: return
            if (value is Boolean) return
            val normalized = when (value) {
                is Number -> value.toInt() != 0
                is String -> when (value.trim().lowercase()) {
                    "true", "1", "yes", "sim", "on" -> true
                    "false", "0", "no", "nao", "off" -> false
                    else -> default
                }
                else -> default
            }
            editor.putBoolean(key, normalized)
            changed = true
        }

        fun normalizeFloat(key: String, default: Float) {
            val value = values[key] ?: return
            if (value is Float && value.isFinite() && value > 0f) return
            val normalized = when (value) {
                is Number -> value.toFloat()
                is String -> value.replace(',', '.').toFloatOrNull()
                else -> null
            }?.takeIf { it.isFinite() && it > 0f } ?: default
            editor.putFloat(key, normalized)
            changed = true
        }

        listOf(
            "accent", "theme_mode", "user_name", "api_url", "api_key", "login_name",
            "role", "last_sync_date", "last_sync_error"
        ).forEach(::normalizeString)
        listOf(
            "online_mode", "privacy_mode", "quick_notification_enabled", "two_factor_enabled", "session_expired"
        ).forEach { normalizeBoolean(it) }
        normalizeFloat("monthly_budget", 5000f)

        listOf("accounts", "entries", "future", "feature_budgets", "feature_goals", "feature_sync_queue", "core_sync_queue").forEach { key ->
            val value = values[key] ?: return@forEach
            val raw = value as? String
            if (raw == null || runCatching { JSONArray(raw) }.isFailure) {
                editor.putString("recovery_$key", value.toString())
                editor.remove(key)
                changed = true
            }
        }

        listOf("feature_shopping", "feature_car", "feature_shared", "feature_commitments").forEach { key ->
            val value = values[key] ?: return@forEach
            val raw = value as? String
            if (raw == null || runCatching { org.json.JSONObject(raw) }.isFailure) {
                editor.putString("recovery_$key", value.toString())
                editor.remove(key)
                changed = true
            }
        }

        if (changed) editor.apply()
    }
}

