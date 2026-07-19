# Plano: importar a prova de Japaratuba/SE (Assistente Social) para o simulado

## 1. Objetivo

Transformar `estudo-concurso/provas/assist_social_japaratuba.pdf` (caderno de
provas, 40 questões) + `estudo-concurso/provas/gabarito_japaratuba.txt`
(gabarito, 40 letras) em um novo bloco dentro de
`src/data/ibam_provas.json`, e tornar essa prova de fato jogável no
frontend — hoje `src/main.js` só carrega `Object.keys(ibamData)[0]`, então
só adicionar a chave no JSON não é suficiente (ver seção 6).

Decisões já tomadas com o usuário (não reabrir):
- `id_concurso`: `"Japaratuba/SE - 2026"` — o PDF não traz número de
  edital em nenhuma página (só timbre "Prefeitura Municipal de Japaratuba -
  SE" + data de geração do arquivo 19/07/2026), então usamos
  município/UF + ano em vez de inventar um número de edital.
- Vale implementar já um seletor de simulado no frontend (seção 6), não só
  entregar o JSON.

## 2. Material de origem

| Arquivo | Conteúdo | Observações |
|---|---|---|
| `assist_social_japaratuba.pdf` | 8 páginas: capa, instruções, 40 questões (só o cargo Assistente Social, não é multi-cargo) | Produced by `FPDF 1.86`, marca d'água `pcimarkpci...` + `www.pciconcursos.com.br` em toda página |
| `gabarito_japaratuba.txt` | 1 linha: 40 letras separadas por espaço, na ordem das questões 1→40 (`B A B C C D A D C B ...`) | Não tem numeração — a posição na lista **é** o número da questão. Sem cargo múltiplo, sem necessidade de recorte de bloco. |

Confirmado por amostragem manual: Q1 → gabarito posição 1 = `B` = "Estado"
(bate com o enunciado sobre instituição coercitiva a serviço das classes
dominantes). Não há questões anuladas (nenhum "X"/"ANULADA" no gabarito).

Distribuição de seções (confirmada no texto de instruções, página 2):
- Questões 01–20: **Conhecimentos Técnico-profissionais**
- Questões 21–30: **Conhecimentos Gerais sobre o Município de Japaratuba**
- Questões 31–40: **Português**

4 alternativas por questão (A–D), formato `A( )` (não `(A)`).

## 3. Problema central: PDF em 2 colunas, `pdftotext -layout` sozinho não basta

`pdftotext -layout` "achata" as duas colunas por posição vertical (y) na
página, então linhas de conteúdo da coluna esquerda e da direita saem
**intercaladas na mesma linha física** quando estão à mesma altura — ex.:
o cabeçalho "Questão 05" (coluna direita) aparece colado no meio do
enunciado da "Questão 01" (coluna esquerda). Isso quebra qualquer regex
que assuma leitura linear.

Sem `-layout`, o `pdftotext` segue a ordem de desenho do PDF, que também
não é coluna-a-coluna (ex.: sai Q01 completa, depois Q05 completa, depois
só o cabeçalho de Q06, depois volta pra Q02...) — não dá pra confiar nisso
também.

**Solução testada e validada**: usar `pdftotext -layout` com recorte de
coordenadas por coluna (`-x`, `-W`, `-H`), processando cada página em duas
chamadas — metade esquerda e metade direita — e concatenando na ordem
`pág N esquerda → pág N direita → pág N+1 esquerda → ...`:

```bash
pdftotext -layout -f $PAGINA -l $PAGINA -x 0   -y 0 -W 306 -H 792 arquivo.pdf -   # coluna esquerda
pdftotext -layout -f $PAGINA -l $PAGINA -x 306 -y 0 -W 306 -H 792 arquivo.pdf -   # coluna direita
```

(Página é 612×792pt / carta; 306 = metade da largura.) Testado nas 6
páginas de questões (3 a 8) e o resultado sai limpo, com `A( )       Igreja`
em uma linha só e a ordem de leitura correta — inclusive quando o texto de
apoio de Português atravessa a coluna esquerda das páginas 6→7 enquanto a
coluna direita da página 6 já mostra as questões 30/31 seguintes.

As páginas 1–2 (capa/instruções) não entram nesse recorte — não têm
questões, só metadados de contexto (cargo, distribuição de seções).

## 4. Estrutura de texto por questão (confirmada por leitura integral do PDF)

Padrão majoritário — cada questão é um bloco:

```
Questão NN

<enunciado, pode quebrar em várias linhas>
A( )       <texto da alternativa A, pode continuar indentado na linha seguinte>
B( )       <...>
C( )       <...>
D( )       <...>
```

Cabeçalhos de seção (linha isolada, sem número de questão):
- `CONHECIMENTOS TÉCNICO-PROFISSIONAIS`
- `CONHECIMENTOS GERAIS SOBRE O MUNICÍPIO DE JAPARATUBA` (quebra em 2
  linhas na extração: `CONHECIMENTOS GERAIS SOBRE O` / `MUNICÍPIO DE
  JAPARATUBA`)
- `PORTUGUÊS`

### Blocos de apoio compartilhado (o caso que exige atenção)

Dois tipos, com escopo diferente:

**a) Contexto persistente** — texto/narrativa que vale para um intervalo
fechado de questões, anunciado explicitamente:
- `Responda às questões 07, 08, 09, 10 e 11, a partir da escuta feita por
  uma assistente social da situação a seguir.` + narrativa do CRAS → vale
  para Q07–Q11.
- `TEXTO: UMA MANHÃ RARA NA BIBLIOTECA` + texto corrido (linhas numeradas
  de 5 em 5, estilo "l. 15-16") → vale para **todas** as questões de
  Português, Q31–Q40, mesmo que o enunciado de cada questão não repita a
  palavra "texto" (Q37/38/39/40 só citam o número da linha).

**b) Contexto pontual** — instrução curta + mini-trecho citado, que vale
só para as 1-2 questões nomeadas explicitamente na própria instrução, e
depois não se aplica mais:
- `Analise, no trecho abaixo, a palavra "religioso". Em seguida, responda
  às questões 35 e 36.` + `Lá dentro imperava um silêncio religioso, (l.
  17-18)` → só Q35 e Q36.
- `Releia o fragmento abaixo e, depois, responda às questões 38 e 39.` +
  trecho → só Q38 e Q39.

Q34, Q37 e Q40 **não** têm bloco de apoio separado antes do `Questão NN`:
a citação/trecho já vem embutida dentro do próprio corpo da questão (ex.
Q40 começa com a citação e só depois faz a pergunta). Esses casos não
precisam de tratamento especial — já saem corretos como parte do "corpo da
questão" normal.

### Convenção de saída (herdada do `ibam_provas.json` atual)

Verificado no JSON existente: o campo `texto_relevante` **não é usado em
nenhuma questão hoje** — o texto de apoio compartilhado é simplesmente
**duplicado dentro do campo `questão`**, na frente do enunciado
específico, para cada questão do intervalo. Vamos seguir o mesmo padrão
por consistência (não introduzir um uso novo de `texto_relevante` que o
resto dos dados não usa):

```
questão = [contexto persistente ativo, se houver]
        + "\n\n"
        + [contexto pontual, se houver, para esta questão específica]
        + "\n\n"
        + <enunciado próprio da questão>
```

## 5. Regex propostas

Sobre o texto já concatenado coluna-a-coluna (seção 3):

```python
import re

RE_SECTION = re.compile(
    r'^(CONHECIMENTOS TÉCNICO-PROFISSIONAIS'
    r'|CONHECIMENTOS GERAIS SOBRE O\s+MUNICÍPIO DE JAPARATUBA'
    r'|PORTUGUÊS)\s*$',
    re.MULTILINE
)

RE_QUESTAO = re.compile(r'^Questão\s+(\d{2})\s*$', re.MULTILINE)

# only alternativas A–D neste caderno; letra seguida de "( )"
RE_ALTERNATIVA = re.compile(
    r'^([A-D])\(\s*\)\s+(.+?)(?=^[A-D]\(\s*\)|\Z)',
    re.MULTILINE | re.DOTALL
)

RE_CONTEXTO_PERSISTENTE = re.compile(
    r'(Responda às questões [\d,\s]+e\s+\d+.*?a seguir\.'
    r'|TEXTO:.*?)'
    r'\n\n(.*?)(?=\nQuestão\s+\d{2}\s*\n)',
    re.DOTALL
)

RE_CONTEXTO_PONTUAL = re.compile(
    r'(Analise, no trecho abaixo.*?questões\s+(\d+)\s+e\s+(\d+)\.'
    r'|Releia o fragmento abaixo.*?questões\s+(\d+)\s+e\s+(\d+)\.)'
    r'\n\n(.*?)(?=\nQuestão\s+\d{2}\s*\n)',
    re.DOTALL
)

# limpeza de ruído
RE_RUIDO = re.compile(r'pcimarkpci\S*|www\.pciconc\S*|cursos\.com\.br')
```

Notas de projeto (por que não dá pra usar 1 regex "universal" nem aqui):
- O parser processa o documento **linearmente**: percorre os matches de
  `RE_QUESTAO` em ordem; tudo que está *entre* o fim do bloco de
  alternativas da questão anterior e o `Questão NN` atual é candidato a
  preâmbulo (contexto persistente ou pontual). Isso é mais confiável que
  tentar casar contexto→intervalo de questões com um regex só, porque o
  intervalo de aplicação (persistente vs. pontual) depende de qual
  marcador textual introduziu o bloco (`Responda às questões / TEXTO:`
  = persiste até o próximo marcador do mesmo tipo; `Analise.../Releia...`
  = some depois de aplicado às questões citadas no próprio texto).
- `RE_ALTERNATIVA` precisa de `re.DOTALL` porque alternativas longas
  quebram em 2+ linhas com indentação (ex. Q08, Q16, Q30) — não dá pra
  assumir "uma linha por alternativa".
- Gabarito é trivial (`split()` na única linha, index 0 = questão 1) —
  não precisa de regex de recorte de bloco por cargo como no plano antigo
  (`plano-importacao-provas.md`), porque este PDF já é single-cargo.

## 6. Schema alvo e mapeamento

Mesmo schema documentado em `docs/plano-importacao-provas.md` §3. Valores
fixos para esta prova:

| Campo | Valor |
|---|---|
| `cargo` | `"ASSISTENTE SOCIAL"` |
| `banca` | `"IBAM"` (inferido da URL na capa, `ibam-concursos.org.br`) |
| `id_concurso` | `"Japaratuba/SE - 2026"` (decidido com o usuário, seção 1) |
| `disciplina` (Conhecimentos Técnico-profissionais) | `"Conhecimentos Específicos"` |
| `disciplina` (Conhecimentos Gerais sobre o Município) | `"Conhecimentos Gerais sobre Japaratuba"` |
| `disciplina` (Português) | `"Língua Portuguesa"` |

Chave do bloco no JSON consolidado:
`"IBAM - Prefeitura Municipal de Japaratuba/SE - Assistente Social - 2026"`

`alternativas` no formato já usado: `{"A": "(A) texto", "B": "(B) texto", ...}`.

## 7. Pipeline de implementação

1. `extract_columns.py` — roda os dois `pdftotext -layout` recortados por
   página (seção 3), concatena tudo em um único texto por documento.
2. `parse_japaratuba.py` — aplica os regex da seção 5:
   - detecta seções → preenche `disciplina` corrente;
   - percorre questões, monta `questão` (contexto + enunciado) e
     `alternativas`;
   - lê `gabarito_japaratuba.txt`, mapeia índice→letra;
   - monta os 40 registros no schema da seção 6;
   - grava como novo top-level key dentro de `src/data/ibam_provas.json`
     (mescla com o conteúdo existente, não sobrescreve a prova de São
     Vicente já presente).

## 8. Validação obrigatória antes de aceitar

- exatamente 40 questões extraídas, numeradas 1–40 sem lacunas;
- exatamente 40 letras no gabarito, todas em `{A,B,C,D}`;
- toda `resposta_correta` é uma letra presente em `alternativas` daquela
  questão;
- todas as questões têm exatamente as chaves `A,B,C,D` em `alternativas`
  (nenhuma com 3 ou 5, o que indicaria erro de parsing de alternativa
  quebrada em várias linhas);
- nenhum resíduo de ruído (`pcimarkpci`, `pciconcursos`, `cursos.com.br`)
  sobrando em `questão` ou `alternativas`;
- toda `disciplina` está preenchida com um dos 3 valores mapeados (não o
  nome cru da seção).

## 9. Amostragem manual

Reler manualmente, comparando com o texto extraído por coluna (seção 3):
Q01 (início da prova), Q07 (contexto persistente CRAS), Q11→Q12 (transição
entre páginas), Q20→Q21 (transição de seção), Q30→Q31 (transição de seção
+ início do texto de Português, atravessa página), Q35/Q36 (contexto
pontual), Q40 (última questão). Cobre todos os casos estruturais
identificados na seção 4.

## 10. Frontend: o problema do `Object.keys(ibamData)[0]`

`src/main.js` hoje só usa a primeira chave do JSON — mesmo com o bloco de
Japaratuba correto e mesclado no arquivo, ele nunca aparece sozinho na
tela sem mudança de código. Decidido com o usuário: implementar já um
seletor mínimo, sem redesenhar a tela inicial:

- adicionar um `<select id="exam-select">` na `#start-screen`
  (`index.html`), populado com `Object.keys(ibamData)` — mantém a primeira
  chave (São Vicente) como seleção padrão, então o fluxo atual não muda
  para quem não mexer no seletor;
- em `main.js`, trocar a constante `examQuestions` fixa por uma variável
  reatribuída no evento `change` do seletor (e lida de novo em
  `startExam()`), atualizando `elExamTitle`/`elQCount` junto;
- **fora de escopo**: badge de cargo/ano hardcoded no `index.html`
  (`Cargo: Assistente Social`, `Ano: 2026`) não precisa virar dinâmico
  agora — os dois simulados atuais compartilham esses valores. Se um
  terceiro simulado de cargo/ano diferente entrar depois, essa parte
  precisa ser revisitada (registrar aqui para não esquecer).

## 11. Critério de pronto

- [ ] validação automática (seção 8) passa sem exceções;
- [ ] amostragem manual (seção 9) confere com o PDF original;
- [ ] bloco novo mesclado em `src/data/ibam_provas.json` sem alterar o
      bloco existente de São Vicente;
- [ ] seletor de simulado funcionando no `npm run dev` — dá pra escolher
      Japaratuba, rodar o simulado completo e ver o resultado/desempenho
      por área ao final;
- [ ] `npm test` (Vitest do `SimuladoEngine`) continua passando.
