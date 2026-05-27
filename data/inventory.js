(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};
  P.seedData.schoolAssets = [
  {
    "school": "EE Bairro Turvo dos Almeidas",
    "name": "PC Administrativo",
    "sourceName": "PCs ADM",
    "status": "ok",
    "notes": "PCs ADM: 7 unidades (\"7 pc adm\")"
  },
  {
    "school": "PEI EE Ricardo Campolim de Almeida Neto",
    "name": "Notebook Positivo",
    "sourceName": "Notebooks Cinza (Positivo)",
    "status": "ok",
    "notes": "Notebooks Cinza (Positivo): 15 unidades (com Windows 11 e OK)"
  },
  {
    "school": "PEI EE Ricardo Campolim de Almeida Neto",
    "name": "Notebook Positivo",
    "sourceName": "Notebooks Pretos (Positivo)",
    "status": "ok",
    "notes": "Notebooks Pretos (Positivo): 20 unidades (OK)"
  },
  {
    "school": "PEI EE Ricardo Campolim de Almeida Neto",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 20 unidades (OK)"
  },
  {
    "school": "PEI EE Ricardo Campolim de Almeida Neto",
    "name": "Recarga de dispositivos",
    "sourceName": "Plataforma de recarga",
    "status": "ok",
    "notes": "Plataforma de recarga: 2 unidades"
  },
  {
    "school": "EE Professor Silverio Monteiro",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Cinza (\"net cinza\")",
    "status": "manutencao",
    "notes": "Netbooks Cinza (\"net cinza\"): 26 unidades (sendo 5 com baixa)"
  },
  {
    "school": "EE Professor Silverio Monteiro",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "manutencao",
    "notes": "Tablets: 17 unidades (sendo 2 com baixa)"
  },
  {
    "school": "EE Professor Silverio Monteiro",
    "name": "Recarga de dispositivos",
    "sourceName": "Plataforma de recarga",
    "status": "ok",
    "notes": "Plataforma de recarga: 1 unidade"
  },
  {
    "school": "PEI EE Otavio Ferrari",
    "name": "Equipamento Lenovo",
    "sourceName": "Lenovo",
    "status": "ok",
    "notes": "Lenovo: 25 (7 + 10 + 8)"
  },
  {
    "school": "PEI EE Otavio Ferrari",
    "name": "Equipamento Positivo",
    "sourceName": "Positivo",
    "status": "ok",
    "notes": "Positivo: 6"
  },
  {
    "school": "PEI EE Otavio Ferrari",
    "name": "Equipamento não informado",
    "sourceName": "Sem marca",
    "status": "ok",
    "notes": "Sem marca: 4 (3 + 1)"
  },
  {
    "school": "PEI EE Otavio Ferrari",
    "name": "Recarga de dispositivos",
    "sourceName": "Plataforma de recarga",
    "status": "ok",
    "notes": "Plataforma de recarga: 2"
  },
  {
    "school": "PEI EE Padre Arlindo Vieira",
    "name": "Recarga de dispositivos",
    "sourceName": "Pontos de recarga",
    "status": "ok",
    "notes": "Pontos de recarga: 8"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Recarga de dispositivos",
    "sourceName": "Pontos de recarga",
    "status": "ok",
    "notes": "Pontos de recarga: 3"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook",
    "sourceName": "Netbooks",
    "status": "ok",
    "notes": "Netbooks:"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo",
    "sourceName": "79 Net Positivo (Velhos)",
    "status": "ok",
    "notes": "79 Net Positivo (Velhos)"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo",
    "sourceName": "24 Net Positivo (Novos)",
    "status": "ok",
    "notes": "24 Net Positivo (Novos)"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 65 unidades"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Notebook",
    "sourceName": "Notebooks",
    "status": "manutencao",
    "notes": "Notebooks: 8 Multi Ultra (+1 com chamado)"
  },
  {
    "school": "PEI EE Professor Jose Vasques Ferrari",
    "name": "Chromebook",
    "sourceName": "Chromebooks",
    "status": "ok",
    "notes": "Chromebooks: 57 unidades (7 + 30 + 20)"
  },
  {
    "school": "PEI EE Professor Jose Vasques Ferrari",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Cinza",
    "status": "ok",
    "notes": "Netbooks Cinza: 20 unidades (4 + 1 + 7 + 8)"
  },
  {
    "school": "PEI EE Professor Jose Vasques Ferrari",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Pretos",
    "status": "ok",
    "notes": "Netbooks Pretos: 56 unidades (3 + 39 + 6 + 8)"
  },
  {
    "school": "PEI EE Professor Jose Vasques Ferrari",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 20 unidades"
  },
  {
    "school": "PEI EE Professor Jose Vasques Ferrari",
    "name": "Notebook",
    "sourceName": "Notebook",
    "status": "ok",
    "notes": "Notebook: 1 unidade"
  },
  {
    "school": "PEI EE Professor Jose Vasques Ferrari",
    "name": "Recarga de dispositivos",
    "sourceName": "Carregamento",
    "status": "ok",
    "notes": "Carregamento: 4 unidades (carrinhos/plataformas)"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "Recarga de dispositivos",
    "sourceName": "Carrinhos de Recarga",
    "status": "ok",
    "notes": "Carrinhos de Recarga: 5 unidades"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Cinza (Funcionando)",
    "status": "ok",
    "notes": "Netbooks Cinza (Funcionando): 115 unidades (Soma indicada: 40 + 40 + 35)"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Pretos (Funcionando)",
    "status": "ok",
    "notes": "Netbooks Pretos (Funcionando): 31 unidades"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "Tablet",
    "sourceName": "Tablets (Funcionando)",
    "status": "ok",
    "notes": "Tablets (Funcionando): 66 unidades (40 + 26)"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "Monitor",
    "sourceName": "Monitor",
    "status": "manutencao",
    "notes": "Monitor: \"2 monitores\" (trocados?)"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "PC Administrativo",
    "sourceName": "Pc adm 10",
    "status": "ok",
    "notes": "Pc adm 10"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "TV / Monitor",
    "sourceName": "Tv 2",
    "status": "ok",
    "notes": "Tv 2"
  },
  {
    "school": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "name": "Access Point",
    "sourceName": "12 aps",
    "status": "ok",
    "notes": "12 aps"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Desktop",
    "sourceName": "PCs",
    "status": "ok",
    "notes": "PCs: 7 unidades"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Recarga de dispositivos",
    "sourceName": "Plataforma de recarga",
    "status": "ok",
    "notes": "Plataforma de recarga: 1 unidade"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Desktop",
    "sourceName": "PCs Funcionais",
    "status": "ok",
    "notes": "PCs Funcionais: 14 unidades"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Desktop",
    "sourceName": "PCs para Descarte (Baixa)",
    "status": "manutencao",
    "notes": "PCs para Descarte (Baixa): 9 unidades"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 40 OK / 10 para Descarte"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Netbook",
    "sourceName": "Netbooks",
    "status": "ok",
    "notes": "Netbooks: 18 OK / 3 para Descarte"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Bateria / Pilha",
    "sourceName": "Pilha",
    "status": "manutencao",
    "notes": "Pilha: 6 trocas de pilha"
  },
  {
    "school": "PEI EE Jeminiano David Muzel",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 100 unidades (48 + 52)"
  },
  {
    "school": "PEI EE Jeminiano David Muzel",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Cinza",
    "status": "ok",
    "notes": "Netbooks Cinza: 30 unidades (\"30 net cinza\")"
  },
  {
    "school": "PEI EE Professora Francelina Franco",
    "name": "Recarga de dispositivos",
    "sourceName": "Estações de Carregamento",
    "status": "ok",
    "notes": "Estações de Carregamento: 4"
  },
  {
    "school": "PEI EE Professora Francelina Franco",
    "name": "Desktop",
    "sourceName": "27 PCs (?)",
    "status": "ok",
    "notes": "27 PCs (?)"
  },
  {
    "school": "PEI EE Professora Francelina Franco",
    "name": "Tablet",
    "sourceName": "Sem Funcionar",
    "status": "ok",
    "notes": "Sem Funcionar: 30 Netbooks e 21 Tablets."
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Netbook",
    "sourceName": "Netbooks",
    "status": "ok",
    "notes": "Netbooks: 36 Net Positivo (Todos com Windows 11)"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 40 unidades"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Notebook",
    "sourceName": "Notebooks",
    "status": "ok",
    "notes": "Notebooks: 2 Note Multi"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Recarga de dispositivos",
    "sourceName": "Plataforma de recarga",
    "status": "ok",
    "notes": "Plataforma de recarga: 1 unidade"
  },
  {
    "school": "PEI EE Professora Cinira Daniel da Silva",
    "name": "PC Administrativo",
    "sourceName": "PCs",
    "status": "ok",
    "notes": "PCs: 6 unidades (\"6 pc adm\")"
  },
  {
    "school": "PEI EE Professora Cinira Daniel da Silva",
    "name": "Desktop",
    "sourceName": "Bateria",
    "status": "manutencao",
    "notes": "Bateria: \"4 pç trocado bateria\""
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Netbook Positivo",
    "sourceName": "Netbook Cinza",
    "status": "ok",
    "notes": "Netbook Cinza: 33 unidades"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Netbook Positivo",
    "sourceName": "Netbook Preto",
    "status": "ok",
    "notes": "Netbook Preto: 4 unidades"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 17 unidades"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Netbook Positivo",
    "sourceName": "Netbooks Positivo",
    "status": "ok",
    "notes": "Netbooks Positivo: 22 unidades"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Notebook",
    "sourceName": "Notebooks",
    "status": "ok",
    "notes": "Notebooks: 5"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Tablet",
    "sourceName": "Tablets",
    "status": "ok",
    "notes": "Tablets: 3 unidades"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Smartphone",
    "sourceName": "Smartphone",
    "status": "ok",
    "notes": "Smartphone: 0"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Recarga de dispositivos",
    "sourceName": "Plataforma de recarga",
    "status": "ok",
    "notes": "Plataforma de recarga: 1 unidade"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Monitor",
    "sourceName": "Celulares da Receita",
    "status": "ok",
    "notes": "2 unidade(s) | status original: Funcionando | BlueMonitor: 2"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Desktop Lenovo",
    "sourceName": "Desktop Lenovo",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 1"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Monitor",
    "sourceName": "Equipamento adquirido pela escola",
    "status": "ok",
    "notes": "4 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "ok",
    "notes": "21 unidade(s) | status original: Funcionando | BlueMonitor: 21"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "manutencao",
    "notes": "1 unidade(s) | status original: Garantia | BlueMonitor: 1"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Notebook Multilaser Ultra",
    "sourceName": "Notebook Multilaser Ultra",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 1"
  },
  {
    "school": "EE Bairro Boa Vista Intervales",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "ok",
    "notes": "3 unidade(s) | status original: Funcionando | BlueMonitor: 3"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Monitor",
    "sourceName": "Equipamento não informado",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 1"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "ok",
    "notes": "28 unidade(s) | status original: Funcionando | BlueMonitor: 28"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "manutencao",
    "notes": "6 unidade(s) | status original: Garantia | BlueMonitor: 5"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "manutencao",
    "notes": "1 unidade(s) | status original: Manutenção | BlueMonitor: 1"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "defeito",
    "notes": "7 unidade(s) | status original: Baixa | BlueMonitor: 0"
  },
  {
    "school": "EE Bairro Ferreira dos Matos",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "ok",
    "notes": "31 unidade(s) | status original: Funcionando | BlueMonitor: 31"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Desktop Legado Positivo",
    "sourceName": "Desktop Legado Positivo",
    "status": "defeito",
    "notes": "2 unidade(s) | status original: Baixa | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Desktop Legado Positivo",
    "sourceName": "Desktop Legado Positivo",
    "status": "ok",
    "notes": "4 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Desktop Lenovo",
    "sourceName": "Desktop Lenovo",
    "status": "ok",
    "notes": "7 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Desktop Lenovo",
    "sourceName": "Desktop Lenovo",
    "status": "manutencao",
    "notes": "1 unidade(s) | status original: Garantia | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "ok",
    "notes": "33 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Netbook Positivo 1210",
    "sourceName": "Netbook Positivo 1210",
    "status": "ok",
    "notes": "3 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Notebook Multilaser Ultra",
    "sourceName": "Notebook Multilaser Ultra",
    "status": "ok",
    "notes": "2 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Doutor Antonio Deffune",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "ok",
    "notes": "17 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Desktop Legado Positivo",
    "sourceName": "Desktop Legado Positivo",
    "status": "ok",
    "notes": "8 unidade(s) | status original: Funcionando | BlueMonitor: 1"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Desktop Legado Positivo",
    "sourceName": "Desktop Legado Positivo",
    "status": "manutencao",
    "notes": "2 unidade(s) | status original: Manutenção | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Desktop Lenovo",
    "sourceName": "Desktop Lenovo",
    "status": "ok",
    "notes": "10 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Monitor",
    "sourceName": "Equipamento adquirido pela escola",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Monitor",
    "sourceName": "Equipamento adquirido pela escola",
    "status": "manutencao",
    "notes": "1 unidade(s) | status original: Manutenção | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Monitor",
    "sourceName": "Equipamento não informado",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "ok",
    "notes": "10 unidade(s) | status original: Funcionando | BlueMonitor: 9"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "manutencao",
    "notes": "3 unidade(s) | status original: Manutenção | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Notebook Multilaser Ultra",
    "sourceName": "Notebook Multilaser Ultra",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 0"
  },
  {
    "school": "EE Professor Gerson de Barros Margarido",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "ok",
    "notes": "14 unidade(s) | status original: Funcionando | BlueMonitor: 14"
  },
  {
    "school": "EE Professor Silverio Monteiro",
    "name": "Desktop Lenovo",
    "sourceName": "Desktop Lenovo",
    "status": "ok",
    "notes": "13 unidade(s) | status original: Funcionando | BlueMonitor: 3"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Desktop Legado Positivo",
    "sourceName": "Desktop Legado Positivo",
    "status": "ok",
    "notes": "23 unidade(s) | status original: Funcionando | BlueMonitor: 23"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Desktop Lenovo",
    "sourceName": "Desktop Lenovo",
    "status": "ok",
    "notes": "11 unidade(s) | status original: Funcionando | BlueMonitor: 11"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "defeito",
    "notes": "4 unidade(s) | status original: Baixa/0 | BlueMonitor: 0"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "ok",
    "notes": "56 unidade(s) | status original: Funcionando | BlueMonitor: 56"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "manutencao",
    "notes": "2 unidade(s) | status original: Garantia | BlueMonitor: 0"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Notebook Multilaser Ultra",
    "sourceName": "Notebook Multilaser Ultra",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 1"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Notebook Multilaser Ultra",
    "sourceName": "Notebook Multilaser Ultra",
    "status": "manutencao",
    "notes": "1 unidade(s) | status original: Garantia | BlueMonitor: 0"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "defeito",
    "notes": "6 unidade(s) | status original: Baixa | BlueMonitor: 0"
  },
  {
    "school": "PEI EE Idalicio Mendes Lima",
    "name": "Tablet Positivo",
    "sourceName": "Tablet Positivo",
    "status": "ok",
    "notes": "35 unidade(s) | status original: Funcionando | BlueMonitor: 35"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Monitor",
    "sourceName": "Equipamento não informado",
    "status": "ok",
    "notes": "1 unidade(s) | status original: Funcionando | BlueMonitor: 1"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "ok",
    "notes": "57 unidade(s) | status original: Funcionando | BlueMonitor: 57"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "manutencao",
    "notes": "1 unidade(s) | status original: Manutenção | BlueMonitor: 1"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "defeito",
    "notes": "2 unidade(s) | status original: Sem status | BlueMonitor: 1"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo 1210",
    "sourceName": "Netbook Positivo 1210",
    "status": "defeito",
    "notes": "1 unidade(s) | status original: Baixa | BlueMonitor: 1"
  },
  {
    "school": "PEI EE Oscar Kurtz Camargo",
    "name": "Netbook Positivo 1210",
    "sourceName": "Netbook Positivo 1210",
    "status": "ok",
    "notes": "22 unidade(s) | status original: Funcionando | BlueMonitor: 22"
  },
  {
    "school": "PEI EE Professora Francelina Franco",
    "name": "Netbook Positivo 1110",
    "sourceName": "Netbook Positivo 1110",
    "status": "defeito",
    "notes": "1 unidade(s) | status original: Sem status | BlueMonitor: 0"
  }
];
})();
