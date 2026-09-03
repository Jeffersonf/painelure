package com.painelure.app.data

data class PendingWrite(val path: String, val body: String, val method: String = "PUT")

object PendingWriteQueue {
    fun append(items: List<PendingWrite>, item: PendingWrite): List<PendingWrite> = items + item
    fun retainFailed(items: List<PendingWrite>, successfulIndexes: Set<Int>): List<PendingWrite> = items.filterIndexed { index, _ -> index !in successfulIndexes }
    fun shouldQueue(errorMessage: String?): Boolean = !errorMessage.orEmpty().contains("STALE_APP_STATE", ignoreCase = true)
}
