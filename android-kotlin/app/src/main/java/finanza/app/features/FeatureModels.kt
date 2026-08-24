package com.painelure.app.features

enum class FeatureFieldKind { TEXT, MONEY, NUMBER, DATE, CHOICE }

data class FeatureFieldUi(
    val key: String,
    val label: String,
    val value: String = "",
    val kind: FeatureFieldKind = FeatureFieldKind.TEXT,
    val options: List<String> = emptyList()
)

data class FeatureItemUi(
    val id: String,
    val title: String,
    val subtitle: String,
    val value: String = "",
    val status: String = "",
    val progress: Float? = null,
    val emoji: String,
    val fields: List<FeatureFieldUi>,
    val primaryAction: String = "",
    val secondaryAction: String = "",
    val canEdit: Boolean = true,
    val canDelete: Boolean = true
)

data class FeatureModuleUi(
    val id: String,
    val title: String,
    val subtitle: String,
    val emoji: String,
    val items: List<FeatureItemUi>,
    val newFields: List<FeatureFieldUi>,
    val emptyText: String,
    val insights: List<FeatureInsightUi> = emptyList(),
    val trends: List<FeatureTrendUi> = emptyList(),
    val canCreate: Boolean = true
)

data class FeatureInsightUi(val label: String, val value: String, val detail: String = "")

data class FeatureTrendUi(val label: String, val value: String, val share: Float)

data class FeatureCenterUiState(
    val modules: List<FeatureModuleUi>,
    val pendingSync: Int,
    val online: Boolean
)

data class FeatureMutation(
    val moduleId: String,
    val action: String,
    val itemId: String,
    val payload: String
)

data class FeatureActions(
    val save: (String, String?, Map<String, String>) -> Boolean,
    val delete: (String, String) -> Unit,
    val primary: (String, String) -> Unit,
    val secondary: (String, String) -> Unit,
    val importBackup: () -> Unit,
    val importTransactions: () -> Unit,
    val exportBackup: () -> Unit,
    val sync: () -> Unit
)

