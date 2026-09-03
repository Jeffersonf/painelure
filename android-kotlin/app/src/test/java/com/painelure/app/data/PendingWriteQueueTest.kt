package com.painelure.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PendingWriteQueueTest {
    @Test fun appendPreservesOrderAndMethod() {
        val source = listOf(PendingWrite("/api/mobile/actions", "{\"type\":\"calls\"}", "POST"), PendingWrite("/api/internal", "{}"))
        assertEquals(source + PendingWrite("/api/data", "{}"), PendingWriteQueue.append(source, PendingWrite("/api/data", "{}")))
    }

    @Test fun successfulWritesAreRemovedAndFailuresRemain() {
        val source = listOf(PendingWrite("/api/one", "{}"), PendingWrite("/api/two", "{}"))
        val remaining = PendingWriteQueue.retainFailed(source, setOf(0))
        assertEquals(listOf(source[1]), remaining)
        assertTrue(remaining.single().path == "/api/two")
    }
    @Test fun staleStateIsNotQueued() {
        assertTrue(!PendingWriteQueue.shouldQueue("STALE_APP_STATE"))
        assertTrue(PendingWriteQueue.shouldQueue("Erro de conexão"))
    }
}
