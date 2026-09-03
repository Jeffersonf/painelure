package com.painelure.app.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissionPolicyTest {
    @Test fun administratorSeesAdministrativeModules() {
        assertTrue(PermissionPolicy.can("Administrador", "admin"))
        assertTrue(PermissionPolicy.can("Administrador", "reports"))
        assertTrue(PermissionPolicy.can("Administrador", "inventory"))
    }

    @Test fun consultaCannotSeeRestrictedModules() {
        assertTrue(PermissionPolicy.can("Consulta", "dashboard"))
        assertTrue(PermissionPolicy.can("Consulta", "schools"))
        assertFalse(PermissionPolicy.can("Consulta", "admin"))
        assertFalse(PermissionPolicy.can("Consulta", "inventory"))
    }

    @Test fun accentsAndUnknownRolesAreHandledSafely() {
        assertTrue(PermissionPolicy.can("Supervisão", "supervision"))
        assertFalse(PermissionPolicy.can("Perfil inexistente", "admin"))
    }
}
