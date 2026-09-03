package com.painelure.app.data

import java.text.Normalizer

object PermissionPolicy {
    private val access = mapOf(
        "Administrador" to setOf("dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "satisfaction", "satisfaction-online", "internal", "reports", "profiles", "quality", "admin"),
        "Supervisao" to setOf("dashboard", "schools", "supervision", "contacts", "calendar"),
        "Tecnicos CTC" to setOf("dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "internal", "reports", "profiles", "quality"),
        "SETEC" to setOf("dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar"),
        "SEINTEC" to setOf("dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "internal", "reports", "profiles", "quality"),
        "Consulta" to setOf("dashboard", "schools", "contacts", "calendar"),
        "Gabinete" to setOf("dashboard", "schools", "calls", "contacts", "cars", "calendar"),
        "Dirigente" to setOf("dashboard", "schools", "calls", "contacts", "cars", "calendar"),
        "Carros" to setOf("dashboard", "cars", "calendar"),
        "Pedagogico" to setOf("dashboard", "schools", "supervision", "contacts", "calendar"),
        "CTC" to setOf("dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "internal", "reports", "profiles", "quality"),
        "SEOM" to setOf("dashboard", "schools", "contacts", "cars", "calendar"),
        "SEFISC" to setOf("dashboard", "cars", "calendar"),
        "SEGRE" to setOf("dashboard", "cars", "calendar"),
        "SEVESC" to setOf("dashboard", "cars", "calendar"),
        "SEMAT" to setOf("dashboard", "cars", "calendar"),
        "SEPES" to setOf("dashboard", "cars", "calendar"),
        "SEFREP" to setOf("dashboard", "cars", "calendar"),
        "SEAPE" to setOf("dashboard", "cars", "calendar"),
        "SEAFIM" to setOf("dashboard", "cars", "calendar"),
        "SEFIN" to setOf("dashboard", "cars", "calendar"),
        "SECOMSE" to setOf("dashboard", "cars", "calendar")
    )

    fun can(role: String, module: String, customAccess: Map<String, Set<String>> = emptyMap()): Boolean {
        fun normalize(value: String) = Normalizer.normalize(value.lowercase(), Normalizer.Form.NFD).replace("\\p{Mn}".toRegex(), "")
        val normalized = normalize(role.trim())
        val custom = customAccess.entries.firstOrNull { normalize(it.key) == normalized || normalized.contains(normalize(it.key)) }
        if (custom != null) return module in custom.value
        val key = access.keys.firstOrNull { normalize(it) == normalized }
            ?: access.keys.firstOrNull { normalized.contains(normalize(it)) }
            ?: "Consulta"
        return module in (access[key] ?: access.getValue("Consulta"))
    }
}
