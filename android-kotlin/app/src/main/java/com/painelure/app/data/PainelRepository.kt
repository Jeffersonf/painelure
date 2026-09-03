package com.painelure.app.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

internal fun extractPainelAppData(result: JSONObject): JSONObject {
    val envelope = result.optJSONObject("data")
    return envelope?.optJSONObject("appData")
        ?: envelope?.takeIf { it.has("schools") || it.has("contacts") || it.has("inventory") }
        ?: result.optJSONObject("appData")
        ?: result.takeIf { it.has("schools") || it.has("contacts") || it.has("inventory") }
        ?: error("Resposta sem dados")
}

class PainelRepository(private val context: Context, private val baseUrl: String) {
    private val prefs = context.getSharedPreferences("painelure-cache", Context.MODE_PRIVATE)
    private val packagedSeed: JSONObject by lazy {
        runCatching { JSONObject(context.assets.open("seed-data.json").bufferedReader().use { it.readText() }) }
            .getOrElse { JSONObject() }
    }

    fun login(username: String, password: String): Result<Session> = runCatching {
        val result = request("/api/auth/login", "POST", JSONObject().put("username", username).put("password", password).toString())
        val token = result.optString("token")
        require(token.isNotBlank()) { result.optString("error", "Não foi possível entrar") }
        Session(token, userFrom(result.optJSONObject("user")))
    }

    fun currentUser(token: String): Result<PainelUser> = runCatching {
        userFrom(request("/api/auth/me", "GET", token = token).optJSONObject("user"))
    }

    fun health(): Result<JSONObject> = runCatching {
        request("/api/health", "GET")
    }

    fun logout(token: String) = runCatching { request("/api/auth/logout", "POST", token = token) }

    fun updateMyProfile(token: String, fields: JSONObject): Result<PainelUser> = runCatching {
        userFrom(request("/api/users/me", "PUT", fields.toString(), token).optJSONObject("user"))
    }

    fun createUser(token: String, fields: JSONObject): Result<JSONObject> = runCatching {
        request("/api/users", "POST", fields.toString(), token)
    }

    fun updateUser(token: String, id: String, fields: JSONObject): Result<JSONObject> = runCatching {
        request("/api/users/${java.net.URLEncoder.encode(id, "UTF-8")}", "PUT", fields.toString(), token)
    }

    fun deleteUser(token: String, id: String): Result<Unit> = runCatching {
        request("/api/users/${java.net.URLEncoder.encode(id, "UTF-8")}", "DELETE", token = token)
    }

    fun saveSources(token: String, sources: JSONObject): Result<JSONObject> = runCatching {
        request("/api/sources", "PUT", JSONObject().put("sources", sources).toString(), token)
    }

    fun refreshOfficialSources(token: String, keys: List<String> = emptyList()): Result<JSONObject> = runCatching {
        val selected = JSONArray().apply { keys.forEach(::put) }
        try {
            request("/api/sources/refresh", "POST", JSONObject().put("keys", selected).toString(), token)
        } catch (error: IllegalStateException) {
            val message = error.message.orEmpty()
            if (!message.contains("404") && !message.contains("endpoint não encontrado", true)) throw error
            refreshOfficialSourcesFallback(token, keys)
        }
    }

    private fun refreshOfficialSourcesFallback(token: String, keys: List<String>): JSONObject {
        val sourcePayload = request("/api/sources", "GET")
        val sourceRows = sourcePayload.optJSONArray("sources") ?: JSONArray()
        val selected = keys.toSet()
        val results = JSONArray()
        for (index in 0 until sourceRows.length()) {
            val source = sourceRows.optJSONObject(index) ?: continue
            val key = source.optString("key")
            if (key.isBlank() || (selected.isNotEmpty() && key !in selected)) continue
            try {
                val type = source.optString("type").lowercase()
                val csv = if (type == "sharepoint-list") {
                    val rows = request("/api/sharepoint-list?url=${URLEncoder.encode(source.optString("url"), "UTF-8")}", "GET", token = token).optJSONArray("rows") ?: JSONArray()
                    jsonRowsToCsv(rows)
                } else {
                    fetchSourceText(source)
                }
                request("/api/import/${URLEncoder.encode(key, "UTF-8")}", "POST", csv, token)
                results.put(JSONObject().put("key", key).put("status", "loaded"))
            } catch (error: Exception) {
                results.put(JSONObject().put("key", key).put("status", "error").put("error", error.message.orEmpty()))
            }
        }
        return JSONObject().put("ok", true).put("fallback", true).put("results", results)
    }

    private fun fetchSourceText(source: JSONObject): String {
        var sourceUrl = source.optString("url").trim()
        val gid = source.optJSONObject("metadata")?.optString("gid").orEmpty()
        val published = Regex("docs\\.google\\.com/spreadsheets/d/e/([^/]+)", RegexOption.IGNORE_CASE).find(sourceUrl)
        val regular = Regex("docs\\.google\\.com/spreadsheets/d/([^/]+)", RegexOption.IGNORE_CASE).find(sourceUrl)
        if (gid.isNotBlank() && published != null) sourceUrl = "https://docs.google.com/spreadsheets/d/e/${published.groupValues[1]}/pub?output=csv&single=true&gid=${URLEncoder.encode(gid, "UTF-8")}"
        else if (gid.isNotBlank() && regular != null) sourceUrl = "https://docs.google.com/spreadsheets/d/${regular.groupValues[1]}/export?format=csv&gid=${URLEncoder.encode(gid, "UTF-8")}"
        val connection = URL(sourceUrl).openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 15000
        connection.readTimeout = 30000
        if (connection.responseCode !in 200..299) error("Fonte ${source.optString("key")} respondeu HTTP ${connection.responseCode}")
        return connection.inputStream.bufferedReader().use { it.readText() }
    }

    private fun jsonRowsToCsv(rows: JSONArray): String {
        val keys = linkedSetOf<String>()
        for (index in 0 until rows.length()) rows.optJSONObject(index)?.keys()?.forEach { keys.add(it) }
        fun csv(value: Any?): String {
            val text = value?.toString().orEmpty().replace("\"", "\"\"")
            return "\"$text\""
        }
        return buildString {
            append(keys.joinToString(",", transform = ::csv)).append('\n')
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                append(keys.joinToString(",") { key -> csv(row.opt(key)) }).append('\n')
            }
        }
    }

    fun saveAdminConfig(token: String, accessRules: JSONObject, pageMaintenance: JSONObject): Result<JSONObject> = runCatching {
        val appData = JSONObject(cachedDataJson())
        appData.put("accessRules", accessRules)
        appData.put("pageMaintenance", pageMaintenance)
        saveData(token, appData, appData.optString("updatedAt"), true).getOrThrow()
    }

    fun saveInternal(token: String, internal: JSONObject): Result<JSONObject> = runCatching {
        request("/api/internal", "PUT", JSONObject().put("internal", internal).toString(), token)
    }

    fun saveSchoolProfile(token: String, schoolName: String, fields: JSONObject, baseUpdatedAt: String, allowOnline: Boolean = true): Result<JSONObject> = runCatching {
        val appData = JSONObject(cachedDataJson())
        val schools = appData.optJSONArray("schools") ?: JSONArray().also { appData.put("schools", it) }
        for (index in 0 until schools.length()) {
            val row = schools.optJSONObject(index) ?: continue
            if (first(row, "name", "school", "nome").equals(schoolName, true)) {
                fields.optString("city").takeIf(String::isNotBlank)?.let { row.put("city", it) }
                fields.optString("cie").takeIf(String::isNotBlank)?.let { row.put("cie", it) }
            }
        }
        val profiles = appData.optJSONArray("schoolProfiles") ?: JSONArray().also { appData.put("schoolProfiles", it) }
        var found = false
        for (index in 0 until profiles.length()) {
            val row = profiles.optJSONObject(index) ?: continue
            if (first(row, "school", "name").equals(schoolName, true)) { fields.keys().forEach { key -> row.put(key, fields.opt(key)) }; row.put("school", schoolName); found = true }
        }
        if (!found) profiles.put(JSONObject(fields.toString()).put("school", schoolName))
        prefs.edit().putString("data", appData.toString()).apply()
        if (allowOnline) {
            request("/api/data", "PUT", JSONObject().put("appData", appData).put("baseUpdatedAt", baseUpdatedAt).toString(), token)
        } else {
            JSONObject().put("ok", true).put("data", appData).put("localOnly", true)
        }
    }

    fun importCsv(token: String, type: String, csv: String): Result<JSONObject> = runCatching {
        require(type in setOf("contacts", "calendar", "inventory", "schools", "network", "supervision")) { "Tipo de importação não permitido" }
        request("/api/import/${java.net.URLEncoder.encode(type, "UTF-8")}", "POST", csv, token)
    }

    fun saveData(token: String, appData: JSONObject, baseUpdatedAt: String, force: Boolean = false): Result<JSONObject> = runCatching {
        val body = JSONObject().put("appData", appData).put("baseUpdatedAt", baseUpdatedAt).put("force", force).toString()
        try { request("/api/data", "PUT", body, token) }
        catch (error: Exception) { if (!force && PendingWriteQueue.shouldQueue(error.message)) enqueue("/api/data", body); throw error }
    }

    fun cachedDataJson(): String = prefs.getString("data", "{}") ?: "{}"

    fun clearCache() {
        prefs.edit().remove("data").remove("pending-writes").apply()
    }

    fun publishCachedData(token: String): Result<JSONObject> = runCatching {
        val cached = JSONObject(cachedDataJson())
        saveData(token, cached, cached.optString("updatedAt"), true).getOrThrow()
    }

    fun importBackup(json: JSONObject): Result<Unit> = runCatching {
        val appData = json.optJSONObject("appData") ?: json
        require(appData.has("schools") || appData.has("contacts") || appData.has("inventory")) { "Backup sem dados do PainelURE" }
        prefs.edit().putString("data", appData.toString()).apply()
    }

    fun adminOverview(token: String): Result<AdminOverview> = runCatching {
        fun read(path: String, key: String): List<AdminRecord> {
            val array = request(path, "GET", token = token).optJSONArray(key) ?: JSONArray()
            return (0 until array.length()).mapNotNull { index ->
                val row = array.optJSONObject(index) ?: return@mapNotNull null
                AdminRecord(row.optString("id"), first(row, "name", "title", "action", "type", "url"), first(row, "detail", "description", "message", "role", "status"), first(row, "createdAt", "created_at", "updatedAt"), first(row, "contactId", "contact_id"))
            }
        }
        AdminOverview(read("/api/users", "users"), read("/api/audit", "events"), read("/api/snapshots", "snapshots"), read("/api/sources", "sources"), read("/api/imports", "imports"))
    }

    fun saveSupervisionJustification(token: String, supervisorName: String, monthKey: String, justification: String): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("supervisorName", supervisorName)
            .put("monthKey", monthKey)
            .put("justification", justification)
            .toString()
        try { request("/api/supervision/justification", "PUT", body, token) }
        catch (error: Exception) { enqueue("/api/supervision/justification", body); throw error }
    }

    fun createMobileAction(token: String, type: String, record: JSONObject): Result<JSONObject> = runCatching {
        val body = JSONObject().put("type", type).put("record", record).toString()
        try { request("/api/mobile/actions", "POST", body, token) }
        catch (error: Exception) { enqueue("/api/mobile/actions", body, "POST"); throw error }
    }

    fun load(token: String): Result<PainelData> = runCatching {
        flushPending(token)
        val result = request("/api/data", "GET", token = token)
        val envelope = result.optJSONObject("data")
        // The API response is { data: { appData: {...}, updatedAt: ... } }.
        // Keep only appData in the local cache so offline parsing has the same shape.
        val data = withSeedFallback(extractPainelAppData(result))
        val normalizedData = JSONObject(data.toString())
        envelope?.optString("updatedAt")?.takeIf(String::isNotBlank)?.let { updatedAt ->
            if (!normalizedData.has("updatedAt")) normalizedData.put("updatedAt", updatedAt)
        }
        val parsed = parse(normalizedData)
        prefs.edit().putString("data", normalizedData.toString()).apply()
        parsed
    }.recoverCatching { error ->
        val cached = prefs.getString("data", null) ?: throw error
        parse(withSeedFallback(JSONObject(cached))).copy(fromCache = true)
    }

    private fun enqueue(path: String, body: String, method: String = "PUT") {
        val pending = readPending()
        writePending(PendingWriteQueue.append(pending, PendingWrite(path, body, method)))
    }

    private fun flushPending(token: String) {
        val pending = readPending()
        val successful = mutableSetOf<Int>()
        pending.forEachIndexed { index, item ->
            try { request(item.path, item.method, item.body, token); successful += index }
            catch (_: Exception) { }
        }
        writePending(PendingWriteQueue.retainFailed(pending, successful))
    }

    private fun readPending(): List<PendingWrite> {
        val array = JSONArray(prefs.getString("pending-writes", "[]"))
        return (0 until array.length()).mapNotNull { index -> array.optJSONObject(index)?.let { item ->
            item.optString("path").takeIf(String::isNotBlank)?.let { PendingWrite(it, item.optString("body"), item.optString("method", "PUT")) }
        } }
    }

    private fun writePending(items: List<PendingWrite>) {
        val array = JSONArray()
        items.forEach { array.put(JSONObject().put("path", it.path).put("body", it.body).put("method", it.method)) }
        prefs.edit().putString("pending-writes", array.toString()).apply()
    }

    private fun withSeedFallback(remote: JSONObject): JSONObject {
        val merged = JSONObject(remote.toString())
        fun fallbackArrays(vararg keys: String) {
            val hasRemote = keys.any { merged.optJSONArray(it)?.length()?.let { length -> length > 0 } == true }
            if (hasRemote) return
            val seed = keys.asSequence().mapNotNull { packagedSeed.optJSONArray(it) }.firstOrNull() ?: return
            keys.forEach { merged.put(it, JSONArray(seed.toString())) }
        }
        fallbackArrays("schools")
        fallbackArrays("schoolProfiles")
        fallbackArrays("inventory", "schoolAssets")
        fallbackArrays("supervisors")
        fallbackArrays("contacts")
        fallbackArrays("calendar")
        fallbackArrays("satisfaction")
        fallbackArrays("ctcVisits")
        fallbackArrays("cars")
        fallbackArrays("calls")
        fallbackArrays("reports")
        fallbackArrays("quality")
        if ((merged.optJSONArray("rede2026")?.length() ?: 0) > 0) return merged
        packagedSeed.optJSONArray("rede2026")?.let { merged.put("rede2026", JSONArray(it.toString())) }
        return merged
    }

    private fun parse(data: JSONObject) = PainelData(
        schools = array(data, "schools").map { School(it.optString("id"), first(it, "name", "school", "nome"), first(it, "city", "cidade"), it.optString("status"), first(it, "phone", "telefone"), it.toStringMap()) },
        schoolProfiles = array(data, "schoolProfiles").map { SchoolProfile(first(it, "school", "name"), it.toStringMap()) },
        inventory = array(data, "inventory", "schoolAssets").map { InventoryItem(it.optString("id"), first(it, "school", "escola"), first(it, "name", "sourceName", "nome"), it.optString("status"), first(it, "serial", "serie"), first(it, "patrimony", "patrimonio"), first(it, "responsible", "responsavel"), first(it, "notes", "observacao")) },
        schoolInventoryMetrics = objectMaps(data.optJSONObject("schoolInventoryMetrics")),
        biEquipmentReport = data.optJSONObject("biEquipmentReport")?.toStringMap() ?: emptyMap(),
        networks = records(data, "networkData"), supervisors = records(data, "supervisors"), contacts = records(data, "contacts"), ctcVisits = records(data, "ctcVisits"), calls = records(data, "calls"), cars = records(data, "cars"), calendar = records(data, "calendar"), satisfaction = records(data, "satisfaction"), rede2026 = records(data, "rede2026", "calendar"), reports = records(data, "reports"), biEquipment = records(data, "biEquipment"), internal = records(data, "internal"), profiles = records(data, "profiles"), quality = records(data, "quality"), roleAccess = accessRules(data.optJSONObject("accessRules")), pageMaintenance = maintenance(data.optJSONObject("pageMaintenance")), internalJson = data.optJSONObject("internal")?.toString() ?: "{}", updatedAt = data.optString("updatedAt")
        , callsMeta = data.optJSONObject("callsMeta")?.toStringMap() ?: emptyMap()
    )

    private fun accessRules(root: JSONObject?): Map<String, Set<String>> {
        val roles = root?.optJSONObject("roleAccess") ?: return emptyMap()
        return roles.keys().asSequence().associateWith { role ->
            val values = roles.optJSONArray(role) ?: JSONArray()
            (0 until values.length()).mapNotNull { values.optString(it).takeIf(String::isNotBlank) }.toSet()
        }
    }

    private fun maintenance(root: JSONObject?): Map<String, Boolean> = root?.keys()?.asSequence()?.associateWith { key ->
        when (val value = root.opt(key)) {
            is JSONObject -> value.optBoolean("enabled", false)
            is Boolean -> value
            else -> false
        }
    } ?: emptyMap()

    private fun records(data: JSONObject, vararg keys: String): List<PanelRecord> = keys.flatMap { key ->
        when (val value = data.opt(key)) {
            is JSONArray -> (0 until value.length()).mapNotNull { value.optJSONObject(it) ?: JSONObject().put("value", value.opt(it)) }
            is JSONObject -> value.keys().asSequence().map { key ->
                val nested = value.optJSONObject(key)
                if (nested != null) JSONObject(nested.toString()).put("title", first(nested, "title", "name", "school", "label").ifBlank { key })
                else JSONObject().put("title", key).put("value", value.opt(key))
            }.toList()
            else -> emptyList()
        }
    }.map { row -> PanelRecord(first(row, "title", "name", "label", "subject", "value").take(180), first(row, "subtitle", "school", "description", "descricao"), row.optString("status"), row.toStringMap()) }.filter { it.title.isNotBlank() }

    private fun array(data: JSONObject, vararg keys: String): List<JSONObject> = keys.asSequence().mapNotNull { data.optJSONArray(it) }.firstOrNull()?.let { a -> (0 until a.length()).mapNotNull { a.optJSONObject(it) } } ?: emptyList()
    private fun first(o: JSONObject, vararg keys: String) = keys.firstNotNullOfOrNull { o.optString(it).takeIf(String::isNotBlank) } ?: ""
    private fun userFrom(o: JSONObject?): PainelUser {
        val preferences = o?.optJSONObject("preferences")
        return PainelUser(
            o?.optString("id").orEmpty(),
            o?.optString("username").orEmpty(),
            o?.optString("name").orEmpty(),
            o?.optString("role").orEmpty().ifBlank { "Consulta" },
            forcePinChange = preferences?.optBoolean("forcePinChange", false) == true,
            avatar = o?.optString("avatar").orEmpty(),
            contactId = first(o ?: JSONObject(), "contactId", "contact_id")
        )
    }
    private fun JSONObject.toStringMap() = keys().asSequence().associateWith { optString(it) }
    private fun objectMaps(root: JSONObject?): Map<String, Map<String, String>> = root?.keys()?.asSequence()?.associateWith { key ->
        root.optJSONObject(key)?.toStringMap() ?: emptyMap()
    } ?: emptyMap()
    private fun request(path: String, method: String, body: String? = null, token: String = ""): JSONObject {
        val c = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        c.requestMethod = method; c.connectTimeout = 15000; c.readTimeout = 30000; c.setRequestProperty("Content-Type", "application/json")
        if (token.isNotBlank()) c.setRequestProperty("Authorization", "Bearer $token")
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
        val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        if (c.responseCode !in 200..299) error(JSONObject(text).optString("error", "Erro HTTP ${c.responseCode}"))
        return JSONObject(text)
    }
}
