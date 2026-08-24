package com.painelure.app

object FinanzaCategories {
    val expenses = listOf(
        "Alimentacao", "Mercado", "Transporte", "Moradia", "Saude",
        "Assinaturas", "Lazer", "Educacao", "Trabalho", "Carro", "Outros"
    )
    val income = listOf("Salario", "Freelance", "Investimentos", "Reembolso", "Outros")
    val due = listOf("Moradia", "Assinaturas", "Fatura", "Servicos", "Outros")

    fun suggestions(type: String): List<String> = when (type) {
        "income" -> income
        "due" -> due
        else -> expenses
    }

    fun normalize(raw: String?): String {
        val value = raw.orEmpty().trim()
        if (value.isBlank() || value.equals("A classificar", true) || value.equals("Geral", true)) return "Outros"
        return (expenses + income + due).firstOrNull { it.equals(value, true) } ?: value
    }

    fun infer(title: String, previousCategory: String? = null): String {
        previousCategory?.takeIf { it.isNotBlank() }?.let { return normalize(it) }
        val value = title.trim().lowercase()
        return when {
            listOf("mercado", "feira", "atacadao", "supermercado").any(value::contains) -> "Mercado"
            listOf("uber", "99", "onibus", "metro", "taxi").any(value::contains) -> "Transporte"
            listOf("ifood", "lanche", "restaurante", "padaria", "delivery").any(value::contains) -> "Alimentacao"
            listOf("farmacia", "medico", "consulta", "hospital").any(value::contains) -> "Saude"
            listOf("aluguel", "condominio", "energia", "agua").any(value::contains) -> "Moradia"
            listOf("internet", "netflix", "spotify", "assinatura").any(value::contains) -> "Assinaturas"
            listOf("gasolina", "etanol", "posto", "oficina").any(value::contains) -> "Carro"
            listOf("curso", "escola", "faculdade", "livro").any(value::contains) -> "Educacao"
            else -> "Outros"
        }
    }
}

