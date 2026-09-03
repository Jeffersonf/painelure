package com.painelure.app.data

enum class PanelModuleState { AVAILABLE, READ_ONLY, PLANNED }

data class PanelModule(
    val key: String,
    val label: String,
    val permission: String,
    val state: PanelModuleState
)

object PanelModuleCatalog {
    val all = listOf(
        PanelModule("dashboard", "Painel", "dashboard", PanelModuleState.AVAILABLE),
        PanelModule("schools", "Escolas", "schools", PanelModuleState.AVAILABLE),
        PanelModule("network", "Redes", "network", PanelModuleState.READ_ONLY),
        PanelModule("inventory", "Inventário", "inventory", PanelModuleState.READ_ONLY),
        PanelModule("supervision", "Supervisão", "supervision", PanelModuleState.READ_ONLY),
        PanelModule("contacts", "Contatos", "contacts", PanelModuleState.READ_ONLY),
        PanelModule("calls", "Chamados / CTC", "calls", PanelModuleState.READ_ONLY),
        PanelModule("ctc", "CTC", "ctc", PanelModuleState.READ_ONLY),
        PanelModule("cars", "Carros", "cars", PanelModuleState.READ_ONLY),
        PanelModule("calendar", "Agenda", "calendar", PanelModuleState.READ_ONLY),
        PanelModule("rede-2026", "Redes 2026", "calendar", PanelModuleState.READ_ONLY),
        PanelModule("satisfaction", "Pesquisa de satisfação", "satisfaction", PanelModuleState.READ_ONLY),
        PanelModule("reports", "Relatórios e BI", "reports", PanelModuleState.READ_ONLY),
        PanelModule("admin", "Administração", "admin", PanelModuleState.READ_ONLY),
        PanelModule("bi-equipment", "BI Equipamentos", "bi-equipment", PanelModuleState.READ_ONLY),
        PanelModule("internal", "Ferramentas internas", "internal", PanelModuleState.READ_ONLY),
        PanelModule("profiles", "Perfis", "profiles", PanelModuleState.READ_ONLY),
        PanelModule("quality", "Qualidade", "quality", PanelModuleState.READ_ONLY)
    )

    fun visibleFor(role: String, customAccess: Map<String, Set<String>> = emptyMap(), maintenance: Map<String, Boolean> = emptyMap()) = all.filter { PermissionPolicy.can(role, it.permission, customAccess) && maintenance[it.key] != true }
}
