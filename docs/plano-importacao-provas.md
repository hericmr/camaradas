# Plano: importar as provas zipadas para o formato JSON do simulado

## 1. Objetivo

Transformar os cadernos de prova + gabaritos que estão em
`../02-Provas - Simulados/*.zip` (uma pasta acima deste repositório) em
arquivos `.json` no mesmo formato que `src/data/ibam_provas.json`, para que
apareçam como simulados jogáveis na aplicação.

Não é uma tarefa de "rodar um script e pronto": os PDFs vêm de bancas
diferentes, com layouts diferentes, e pelo menos um exemplar não tem
gabarito. Por isso o trabalho é dividido em pipeline automatizado +
checkpoints de revisão manual, e não em um único script "confiável de ponta
a ponta".

## 2. Inventário atual

`../02-Provas - Simulados/` contém 10 `.zip`, todos do cargo **Assistente
Social**, mas de bancas e prefeituras diferentes (não são todas do IBAM —
são material de estudo genérico para o cargo). Cada zip contém uma pasta
com 1–2 PDFs:

| Concurso (zip) | Caderno de questões | Gabarito | Observações |
|---|---|---|---|
| Alfredo Chaves/ES | `assistente_social.pdf` (13p) | `gabarito.pdf` (76p, **multi-cargo**) | Seções: Conhecimentos Específicos, Língua Portuguesa, Saúde Pública |
| Boa Vista do Buricá/RS | `assistente_social.pdf` (13p) | `gabarito_oficial.pdf` (64p, **multi-cargo**) | Seções: Conh. Específicos, Conh. Gerais, Legislação, Língua Portuguesa |
| Caconde/SP | `assistente_social.pdf` (17p, 50 questões, alternativas A–E) | `gabarito.pdf` (7p, **multi-cargo**, formato `01: D`) | Banca: Instituto Avança São Paulo. Extração testada e limpa com `pdftotext -layout` |
| Curvelo/MG | `assistente_social.pdf` (14p) | `gabarito.pdf` (12p, **multi-cargo**) | Seções: Conh. Específicos, Legislação Municipal, Língua Portuguesa |
| Almirante Tamandaré/PR | `assistente_social.pdf` (10p) | **— não existe no zip —** | ⚠️ precisa de gabarito de outra fonte ou fica de fora |
| Pref. e Câmara de Braga/RS | `assistente_social.pdf` (14p) | `gabaritos_preliminares.pdf` (64p, **multi-cargo**) | Mesmo padrão de seções da Boa Vista do Buricá (mesma banca/gráfica?) |
| Fontoura Xavier/RS | `assistente_social.pdf` (8p, 40 questões) | `gabarito.pdf` (3p, **multi-cargo**, formato `01) B`) | Banca: Objetiva Concursos. Formato de gabarito **diferente** do de Caconde |
| Matupã/MT | `assistente_social.pdf` (8p) | `gabarito.pdf` (16p, **multi-cargo**) | Não inspecionado em detalhe ainda |
| Palmeira dos Índios/AL | `assistente_social.pdf` (11p) | `gabarito.pdf` (43p, **multi-cargo**) | Não inspecionado em detalhe ainda |
| São Miguel Arcanjo/SP | `assistente_social.pdf` (18p) | `gabarito_oficial.pdf` (9p, **multi-cargo**) | Seções incluem Noções de Informática, Raciocínio Lógico |

Confirmado por amostragem (`pdftotext -layout`): todos os PDFs têm camada de
texto extraível (nenhum é scan de imagem puro), então **não é necessário
OCR**. Mas:

- Todos os `gabarito*.pdf` trazem o gabarito de **todos os cargos do
  concurso**, não só Assistente Social — é preciso localizar o bloco certo
  dentro do PDF.
- O formato de cada gabarito varia por banca (`01: D` vs `01) B`, vistos
  até agora — outras bancas podem trazer outros formatos ainda).
- Os PDFs de prova têm marca d'água de origem (`pciconcursos.com.br`) que
  aparece como texto solto e precisa ser filtrada.
- Os nomes das seções/disciplinas variam por prova (não há uma lista fixa
  de disciplinas como no `ibam_provas.json` atual).
- Os cadernos têm layout em 2 colunas; `pdftotext -layout` reconstituiu a
  ordem de leitura corretamente na amostra testada (Caconde), mas isso
  precisa ser conferido prova a prova, não assumido.

## 3. Formato de destino (schema atual do site)

Cada questão consumida por `src/main.js` (função `renderQuestion`) e pelo
`SimuladoEngine` precisa destes campos:

```jsonc
{
  "questão": "string — enunciado da questão (pode incluir \n)",
  "texto_relevante": "string opcional — texto de apoio/coletânea compartilhado por um bloco de questões",
  "alternativas": { "A": "(A) texto...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "resposta_correta": "A" /* ou "Nula" para questão anulada */,
  "disciplina": "string — usada no card superior e no novo desempenho por área",
  "cargo": "string",
  "id_concurso": "string — edital/ano",
  "banca": "string opcional — usado no card superior (hoje só existe hardcoded 'IBAM' no HTML)"
}
```

Pontos de atenção herdados do código atual:

- `alternativas` aceita qualquer conjunto de letras (`Object.entries` é
  genérico), então A–D ou A–E funcionam sem mudar o motor.
- `resposta_correta === "Nula"` já é tratado como acerto automático em
  `SimuladoEngine.isAnswerCorrect` — usar esse valor para questões anuladas
  encontradas no gabarito.
- **Limitação importante a resolver à parte:** `src/main.js` hoje só
  carrega `Object.keys(ibamData)[0]` — ou seja, mesmo colocando 10 provas
  no JSON (ou 10 arquivos), a página só vai carregar a primeira. Antes de
  as novas provas aparecerem de fato "na página de simulados", é preciso
  decidir e implementar:
  - opção A: uma tela de seleção de simulado (lista as chaves do JSON,
    usuário escolhe uma);
  - opção B: um arquivo JSON por prova + um índice, com seletor.
  Esse é um pedaço de trabalho de frontend separado da extração de dados
  em si — citado aqui para não ser esquecido, mas fora do escopo deste
  pipeline de importação.

## 4. Pipeline proposto

Trabalho em Python (`pdftotext` do poppler já disponível no sistema via
`subprocess`; não depender de libs não instaladas como `pdfplumber`/`fitz`
a menos que se confirme necessidade e se instale antes).

### Etapa 0 — Descompactação padronizada
Script `unzip_all.py`: extrai os 10 zips para uma pasta de trabalho local
(ex.: `tools/import_provas/raw/<slug-do-concurso>/`), normalizando nomes de
pasta (sem espaços/acentos problemáticos) e registrando um manifesto
(`manifest.json`) com: zip de origem, arquivos extraídos, hash SHA-256.
Idempotente — pode rodar de novo sem duplicar.

### Etapa 1 — Extração de texto bruto
Para cada PDF (prova e gabarito), rodar `pdftotext -layout` e salvar o
`.txt` ao lado do PDF em `raw/<slug>/`. Isso cria um artefato intermediário
revisável por humano antes de qualquer parsing — se o texto sair
embaralhado (coluna trocada, tabela quebrada), fica visível aqui, antes de
gerar JSON errado silenciosamente.

### Etapa 2 — Perfil de parsing por prova (não um regex universal)
Como já ficou claro na amostragem (formatos `01: D` vs `01) B`, seções com
nomes diferentes, marcas d'água diferentes), **não dá para ter um parser
único**. Proposta: um arquivo `profiles/<slug>.py` (ou `.yaml`) por
concurso, com:
- padrão regex para detectar início de questão (`QUESTÃO\s+(\d+)` etc.);
- padrão regex para alternativas (`\([A-E]\)` no início da linha, ou outra
  variação encontrada);
- padrão regex para o bloco do gabarito relevante (localizar o cabeçalho
  `ASSISTENTE SOCIAL` dentro do gabarito multi-cargo e capturar só aquele
  intervalo até o próximo cabeçalho de cargo);
- padrão regex do próprio par número/letra do gabarito (`01: D` vs `01) B`);
- linhas/trechos de ruído a descartar (marca d'água `pcimarkpci...`,
  rodapé `www.pciconcursos.com.br`, cabeçalho repetido de página).
- mapeamento manual de seções → nome de `disciplina` (ex.: "QUESTÕES DE
  SAÚDE PÚBLICA" → `"SUS e Saúde Pública"`, para manter consistência com o
  que já existe no `ibam_provas.json`).

Isso é mais trabalho inicial que um script único, mas é o que evita gerar
40–50 questões erradas por prova de forma silenciosa quando o layout muda.

### Etapa 3 — Parse e merge
Script genérico `build_json.py <slug>` que usa o perfil da Etapa 2 para:
1. Extrair lista de questões (número, `texto_relevante` quando houver texto
   de apoio compartilhado por várias questões, enunciado, alternativas).
2. Extrair o gabarito só do bloco do cargo certo (número → letra, ou
   `"Nula"` quando a fonte marcar anulação — bancas costumam usar "ANULADA",
   "X", ou simplesmente pular o número).
3. Cruzar por número da questão, preencher `cargo`, `id_concurso`, `banca`,
   `disciplina` (via o mapeamento de seção do perfil).
4. Gravar em `src/data/<slug>.json` (ou seção própria dentro de um JSON
   consolidado — depende da decisão da Etapa de frontend do item 3).

### Etapa 4 — Validação automática (obrigatória antes de aceitar)
Checklist que o script deve verificar e reportar, não assumir:
- nº de questões extraídas da prova == nº de entradas achadas no gabarito
  daquele cargo (senão, listar quais números faltam de um lado ou outro);
- toda `resposta_correta` é uma letra presente em `alternativas` daquela
  questão, ou `"Nula"`;
- nenhuma `questão`/alternativa vazia ou com resíduo óbvio de ruído (regex
  de marca d'água ainda presente no texto);
- todas as questões de uma prova têm o mesmo conjunto de letras nas
  alternativas (A–D *ou* A–E, não misturado dentro da mesma prova).

Prova que falhar qualquer checagem **não entra automaticamente** no `src/data/`
— fica marcada para revisão manual.

### Etapa 5 — Amostragem manual
Mesmo com validação automática passando, ler manualmente 3–5 questões
aleatórias por prova comparando com o PDF original (visualmente, abrindo o
PDF), porque erro de parsing por coluna trocada pode gerar uma questão com
texto sintaticamente válido mas semanticamente errado (ex.: pedaço da
questão 7 grudado com alternativas da questão 8) — isso não é pego por
nenhuma validação automática de formato.

## 5. Ordem de execução sugerida

Começar pelas menores/mais simples para validar o pipeline antes de
escalar para as 76 páginas de gabarito de Alfredo Chaves:

1. **Fontoura Xavier/RS** — menor de todas (8p prova / 3p gabarito, 40
   questões), formato de gabarito simples (`01) B`).
2. **Caconde/SP** — já testado nesta sessão, extração limpa, formato
   `01: D`, 50 questões, alternativas A–E (bom teste para o caso de 5
   alternativas).
3. **Matupã/MT** e **Curvelo/MG** — portes médios, ainda não inspecionados
   a fundo.
4. **Boa Vista do Buricá/RS** e **Pref. e Câmara de Braga/RS** — parecem
   compartilhar padrão de seções (mesma gráfica?), então o mesmo perfil
   pode servir de base para as duas.
5. **São Miguel Arcanjo/SP** e **Palmeira dos Índios/AL** — portes médios.
6. **Alfredo Chaves/ES** — gabarito de 76 páginas, deixar por último por
   ser o mais custoso de revisar manualmente.
7. **Almirante Tamandaré/PR** — sem gabarito no zip. Decidir antes de
   processar: (a) buscar o gabarito oficial em outra fonte pública, ou (b)
   importar só como material de leitura sem correção automática (fora do
   formato de simulado corrigível), ou (c) deixar de fora por enquanto.

## 6. Riscos

- **Parsing de coluna errado silencioso**: maior risco real, mitigado pela
  Etapa 5 (amostragem manual) — não pular essa etapa achando que a
  validação automática (Etapa 4) é suficiente.
- **Gabarito do cargo errado**: os gabaritos multi-cargo têm dezenas de
  seções parecidas (`ASSISTENTE SOCIAL` vs `ASSISTENTE ADMINISTRATIVO` etc.)
  — o regex de recorte do bloco precisa ser exato, não "primeira ocorrência
  de ASSISTENTE".
- **Uso do material**: são provas de terceiros baixadas de um agregador
  (pciconcursos), para estudo pessoal. Manter o uso restrito a material de
  estudo próprio, sem republicar os PDFs originais.
- **Escopo do frontend**: mesmo com o JSON perfeito, nada aparece de novo
  na página até o item 3 (seleção de simulado) ser resolvido — não é
  automático só por adicionar arquivos em `src/data/`.

## 7. Critério de pronto (por prova)

Uma prova é considerada importada quando:
- [ ] validação automática (Etapa 4) passa sem exceções;
- [ ] amostragem manual de 3–5 questões (Etapa 5) confere com o PDF original;
- [ ] `disciplina` de cada questão está preenchida com um valor mapeado
      deliberadamente (não o nome cru da seção do PDF, quando este for
      redundante/inconsistente entre provas);
- [ ] arquivo final adicionado em `src/data/` e carregável pelo mecanismo
      de seleção de simulado (dependente do item 3).
