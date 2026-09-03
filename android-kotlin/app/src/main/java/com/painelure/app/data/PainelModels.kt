package com.painelure.app.data

data class PainelUser(
    val id: String = "",
    val username: String = "",
    val name: String = "",
    val role: String = "Consulta",
    val permissions: Set<String> = emptySet(),
    val forcePinChange: Boolean = false,
    val avatar: String = "",
    val contactId: String = ""
)

data class School(
    val id: String = "",
    val name: String,
    val city: String = "",
    val status: String = "",
    val phone: String = "",
    val raw: Map<String, String> = emptyMap()
)

data class SchoolProfile(
    val school: String = "",
    val fields: Map<String, String> = emptyMap()
)

data class InventoryItem(
    val id: String = "",
    val school: String = "",
    val name: String,
    val status: String = "",
    val serial: String = "",
    val patrimony: String = "",
    val responsible: String = "",
    val notes: String = ""
)

data class PanelRecord(val title: String, val subtitle: String = "", val status: String = "", val fields: Map<String, String> = emptyMap())

data class PainelData(
    val schools: List<School> = emptyList(),
    val schoolProfiles: List<SchoolProfile> = emptyList(),
    val inventory: List<InventoryItem> = emptyList(),
    val schoolInventoryMetrics: Map<String, Map<String, String>> = emptyMap(),
    val biEquipmentReport: Map<String, String> = emptyMap(),
    val networks: List<PanelRecord> = emptyList(),
    val supervisors: List<PanelRecord> = emptyList(),
    val contacts: List<PanelRecord> = emptyList(),
    val ctcVisits: List<PanelRecord> = emptyList(),
    val calls: List<PanelRecord> = emptyList(),
    val callsMeta: Map<String, String> = emptyMap(),
    val cars: List<PanelRecord> = emptyList(),
    val calendar: List<PanelRecord> = emptyList(),
    val satisfaction: List<PanelRecord> = emptyList(),
    val rede2026: List<PanelRecord> = emptyList(),
    val reports: List<PanelRecord> = emptyList(),
    val biEquipment: List<PanelRecord> = emptyList(),
    val internal: List<PanelRecord> = emptyList(),
    val profiles: List<PanelRecord> = emptyList(),
    val quality: List<PanelRecord> = emptyList(),
    val roleAccess: Map<String, Set<String>> = emptyMap(),
    val pageMaintenance: Map<String, Boolean> = emptyMap(),
    val internalJson: String = "{}",
    val updatedAt: String = "",
    val fromCache: Boolean = false
)

data class Session(val token: String, val user: PainelUser = PainelUser())

data class AdminRecord(val id: String, val title: String, val detail: String = "", val createdAt: String = "", val contactId: String = "")

data class AdminOverview(
    val users: List<AdminRecord> = emptyList(),
    val audit: List<AdminRecord> = emptyList(),
    val snapshots: List<AdminRecord> = emptyList(),
    val sources: List<AdminRecord> = emptyList(),
    val imports: List<AdminRecord> = emptyList()
)
