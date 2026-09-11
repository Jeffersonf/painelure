(function () {
  const contacts = [
    { name: "Andre Dias de Oliveira", role: "Dirigente Regional de Ensino", sector: "Gabinete", email: "deitv@educacao.sp.gov.br", phone: "6202" },
    { name: "Vanessa", role: "Gabinete", sector: "Gabinete", email: "deitv@educacao.sp.gov.br", phone: "6201" },
    { name: "Juliano Lobo Ribeiro", role: "Assistente II", sector: "Gabinete", email: "juliano.ribeiro@educacao.sp.gov.br", phone: "6225" },
    { name: "Juli Francis Oliveira Roza", role: "Executiva Pública", sector: "Gabinete", email: "juli.oliveira@educacao.sp.gov.br", phone: "6219" },

    { name: "Nelio Celso Fernandes Junior", role: "Chefe de Serviço", sector: "Obras", email: "nelio.junior@educacao.sp.gov.br", phone: "6236" },

    { name: "Richard", role: "Protocolo", sector: "Compras", email: "itv.seafin@educacao.sp.gov.br", phone: "6200" },
    { name: "Adriana", role: "Protocolo", sector: "Compras", email: "itv.seafin@educacao.sp.gov.br", phone: "6209" },
    { name: "Juliana", role: "Protocolo", sector: "Compras", email: "itv.seafin@educacao.sp.gov.br", phone: "6233" },
    { name: "Daniel Duchen Hiromitus", role: "Chefe de Seção", sector: "Compras", email: "daniel.hiromitus@educacao.sp.gov.br", phone: "6206" },
    { name: "Silvio", role: "Finanças", sector: "Compras", email: "itv.sefin@educacao.sp.gov.br", phone: "6223" },
    { name: "Nelson da Conceição Junior", role: "Chefe de Seção", sector: "Compras", email: "nelson.junior@educacao.sp.gov.br", phone: "6237" },
    { name: "Rafael Alves Machado", role: "Administração e Finanças", sector: "Compras", email: "rafael.machado@educacao.sp.gov.br", phone: "6220" },
    { name: "Roque", role: "Administração e Finanças", sector: "Compras", email: "itv.secomse@educacao.sp.gov.br", phone: "6229" },
    { name: "Fabricio Santos", role: "Chefe de Seção", sector: "Compras", email: "fabricio.santos05@educacao.sp.gov.br", phone: "6238" },
    { name: "Rodolfo Rodrigues Pereira", role: "Chefe de Serviço", sector: "Compras", email: "rodolfo.pereira@educacao.sp.gov.br", phone: "6240" },

    { name: "Hector Antunes de Carvalho", role: "Diretor II", sector: "RH", email: "hector.carvalho@educacao.sp.gov.br", phone: "6221" },
    { name: "Elenira Trindade Diniz", role: "Pessoas", sector: "RH", email: "elenira.diniz1@educacao.sp.gov.br", phone: "6231" },
    { name: "Paulo Sergio de Oliveira", role: "Administração de Pessoal", sector: "RH", email: "paulo.oliveira@educacao.sp.gov.br", phone: "6222" },
    { name: "Ana Paula", role: "Administração de Pessoal", sector: "RH", email: "itv.seape@educacao.sp.gov.br", phone: "6203" },
    { name: "Wania Chrischner Nunes Figueiredo", role: "Administração de Pessoal", sector: "RH", email: "wania.figueiredo@educacao.sp.gov.br", phone: "6204" },
    { name: "Camila", role: "Administração de Pessoal", sector: "RH", email: "itv.seape@educacao.sp.gov.br", phone: "6234" },

    { name: "Leticia Aparecida Alves dos Santos", role: "Frequência e Pagamento", sector: "Pagamento", email: "leticia.santos01@educacao.sp.gov.br", phone: "6205" },
    { name: "Valeria", role: "Frequência e Pagamento", sector: "Pagamento", email: "itv.sefrep@educacao.sp.gov.br", phone: "6215" },

    { name: "WHATS", role: "WhatsApp institucional", sector: "Tecnologia", email: "itv.setec@educacao.sp.gov.br", phone: "6210" },
    { name: "Jefferson Felipe", role: "Problemas no site", sector: "Tecnologia", email: "jefferson.paula@educacao.sp.gov.br", phone: "WhatsApp" },
    { name: "Elcio Renato Bonifacio de Azevedo", role: "Chefe de Serviço", sector: "Tecnologia", email: "elcio.azevedo@educacao.sp.gov.br", phone: "6211" },
    { name: "Jefferson Felipe", role: "Chefe de Seção", sector: "Tecnologia", email: "jefferson.paula@educacao.sp.gov.br", phone: "6233" },
    { name: "Jeffeson do Espirito Santo Moreira", role: "Técnico Prodesp", sector: "Tecnologia", email: "jefferson.santo@educacao.sp.gov.br", phone: "6235" },
    { name: "Gustavo", role: "CTC", sector: "Tecnologia", email: "itv.setec@educacao.sp.gov.br", phone: "6235" },

    { name: "Priscila Aparecida Conceição Souza", role: "Chefe de Serviço", sector: "Pedagógico", email: "priscila.souza01@educacao.sp.gov.br", phone: "6230" },
    { name: "Rosinei Dell Anhol", role: "Chefe de Seção", sector: "Pedagógico", email: "rosinei.anhol@educacao.sp.gov.br", phone: "6228" },
    { name: "Joao", role: "Vida Escolar", sector: "Pedagógico", email: "itv.sevesc@educacao.sp.gov.br", phone: "6207 / 6239" },
    { name: "Jaqueline de Oliveira Cunha Borelli", role: "PEC - Arte", sector: "Pedagógico", email: "deitvnpe@educacao.sp.gov.br", phone: "6212" },
    { name: "Jose do Amaral Netto", role: "PEC - Projetos Especiais", sector: "Pedagógico", email: "deitvnpe@educacao.sp.gov.br", phone: "6218" },
    { name: "Paula", role: "Especialista em Currículo", sector: "Pedagógico", email: "deitvnpe@educacao.sp.gov.br", phone: "6226" },
    { name: "Marcio Nunes da Cruz", role: "Supervisor Educacional", sector: "Supervisão", email: "marcio.cruz@educacao.sp.gov.br", phone: "6208" },
    { name: "Maria Luiza Brizolla de Queiroz", role: "Supervisor Educacional", sector: "Supervisão", email: "maria.queiroz14@educacao.sp.gov.br", phone: "6216" },
    { name: "Edilene da Silva Almeida Oliveira", role: "Supervisor Educacional", sector: "Supervisão", email: "edilene.oliveira@educacao.sp.gov.br", phone: "6217" },
    { name: "Adilson Fogaça", role: "Supervisor Educacional", sector: "Supervisão", email: "adilson.fogaca@educacao.sp.gov.br", phone: "6224" },
    { name: "Daiane Aparecida de Oliveira Ribeiro", role: "Supervisor Educacional", sector: "Supervisão", email: "daiane.ribeiro@educacao.sp.gov.br", phone: "6227" },
    { name: "Magda Gisele Silva de Oliveira", role: "Supervisor Educacional", sector: "Supervisão", email: "magda.oliveira@educacao.sp.gov.br", phone: "6232" }
  ];

  window.PainelURE = window.PainelURE || {};
  window.PainelURE.seedData = window.PainelURE.seedData || {};
  window.PainelURE.seedData.contacts = contacts;
})();
