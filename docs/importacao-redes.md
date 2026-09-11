# Importação manual de Redes e Câmeras

1. Entre no PainelURE como administrador e abra **Redes e Câmeras**.
2. Abra **Importar planilha de redes e câmeras**.
3. Selecione o `.csv` ou `.xlsx` baixado do SharePoint. Em Excel com várias abas, selecione a aba correta.
4. Confira as escolas e os avisos. Corrija no arquivo escolas não reconhecidas ou duplicadas.
5. Clique em **Aplicar importação** e aguarde a confirmação de gravação.

A leitura acontece no navegador. O arquivo completo e as colunas de usuário e senha não são enviados ao servidor. Somente os campos permitidos de rede, câmeras, CIE, espelhamento e técnicos são enviados. Credenciais já cadastradas são preservadas.

A importação atualiza os campos de rede e câmeras das escolas listadas, incluindo a limpeza de campos que estejam vazios no arquivo. Escolas ausentes permanecem cadastradas. O CIE é a chave prioritária; nomes só são usados quando não há CIE. A linha Diretoria é ignorada.

Os totais usam somente escolas com duas quantidades inteiras válidas e funcionando menor ou igual a instaladas. Observações como “dvr1 16-15/dvr2 32 câmeras 25 ok” são preservadas no detalhe, mas não interpretadas como quantidades. Totais incompletos recebem a indicação **parcial** e a cobertura aparece abaixo dos indicadores. Para obter totais completos, preencha as duas colunas de quantidade com números inteiros por escola.

CSV aceita UTF-8 ou Windows-1252 e é lido com suporte a campos entre aspas e quebras de linha. Limites: 10 MB por arquivo e 2.000 linhas de dados na aba. Arquivos criptografados não são suportados por este fluxo.

A atualização é manual, sem agendamento. A data exibida é a última importação concluída. Em falha de rede, a prévia permanece disponível para uma nova tentativa.

## Publicação

Publicar o frontend junto com a API que oferece `POST /api/network/import`. A API exige administrador, normaliza novamente os campos permitidos, mescla somente as escolas reconhecidas e registra a importação e auditoria. O projeto mantém os mecanismos existentes de armazenamento e snapshots.

O GitHub Pages usa o workflow `.github/workflows/pages.yml`, com fonte de publicação **GitHub Actions**. O pacote contém somente HTML, CSS, JavaScript, assets, dados estáticos e o leitor Excel. O diretório Android e os arquivos do servidor ficam fora da publicação do site. O backend continua com publicação independente.

Leitor local: SheetJS CE 0.20.3 em `vendor/xlsx.full.min.js`, obtido de https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. Licença em `vendor/SheetJS-LICENSE.txt`. O leitor é carregado somente ao selecionar um arquivo.

## Verificação

`npm run check` inclui validação da importação e simulação da rota com armazenamento em memória.

O teste opcional `scripts/check-network-import-browser.cjs` recebe os caminhos de um CSV e, opcionalmente, de um Excel com as mesmas escolas. Configure `PLAYWRIGHT_MODULE` com o caminho de uma instalação de Playwright; `BROWSER_PATH` pode indicar o executável do navegador. O teste utiliza uma página local isolada e gravação simulada, sem alterar dados do painel.
