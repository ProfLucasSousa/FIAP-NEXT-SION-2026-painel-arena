# Symbios Arena

## Visão geral

O **Symbios Arena** é uma aplicação para controle e exibição de uma competição presencial entre três equipes.

A experiência pertence ao universo visual **Symbios**, com estética sci-fi, tecnológica e energética.

A aplicação possui duas interfaces:

* `/display` — painel exibido no telão da arena;
* `/admin` — painel utilizado pelo operador.

O sistema deve funcionar completamente:

* em localhost;
* ou em dois computadores conectados à mesma rede local.

Não deve depender de internet, cloud ou banco de dados.

---

# Equipes

Existem três equipes:

* Titã Vermelho;
* Titã Azul;
* Titã Verde.

Cada equipe possui:

* cor própria;
* pontuação;
* status na fase atual;
* cristal de energia;
* estado de ativação final.

As três equipes disputam a **mesma fase ao mesmo tempo**.

Não existem mais fases diferentes ocorrendo simultaneamente por equipe.

---

# Fases

A competição possui quatro fases:

1. **Encontrar**
2. **Proteger**
3. **Levar**
4. **Ativar**

As três equipes participam da mesma fase atual.

A passagem de uma fase para a próxima é controlada manualmente pelo operador.

O sistema NÃO deve iniciar automaticamente a próxima fase.

---

# Tempo das fases

Existe apenas **um cronômetro compartilhado por fase**.

Não existem:

* timer geral da arena;
* timers individuais por equipe;
* timers individuais por missão.

As durações fixas são:

```text
FASE 1 — ENCONTRAR
08:00

FASE 2 — PROTEGER
06:30

FASE 3 — LEVAR
06:30

FASE 4 — ATIVAR
04:30
```

Todos os cronômetros são regressivos.

---

# Início da fase

Quando uma fase é preparada:

* o cronômetro recebe sua duração fixa;
* as três equipes elegíveis ficam em estado `EM MISSÃO`;
* o cronômetro permanece parado.

O operador utiliza:

```text
INICIAR FASE
```

para iniciar a contagem.

Exemplo:

```text
FASE 2 — PROTEGER

06:30

[ INICIAR FASE ]
```

Depois:

```text
06:29
06:28
06:27
...
```

---

# Regra dos 2 minutos

Essa é uma regra central da competição.

A **primeira equipe que concluir uma fase** dispara uma janela final obrigatória de:

```text
02:00
```

O cronômetro compartilhado deve ser alterado imediatamente para `02:00`, independentemente do tempo que existia anteriormente.

Exemplo:

```text
05:17
```

Primeira equipe conclui:

```text
02:00
```

Outro exemplo:

```text
00:38
```

Primeira equipe conclui:

```text
02:00
```

Portanto, os dois minutos podem tanto reduzir quanto aumentar o tempo restante.

A regra é simplesmente:

```ts
if (!firstCompletionTriggered) {
  remainingTime = 120;
  firstCompletionTriggered = true;
}
```

---

# Disparo único dos 2 minutos

Os `02:00` só podem ser disparados **uma única vez por fase**.

Quando a segunda equipe concluir:

* não reiniciar;
* não voltar para `02:00`;
* não adicionar tempo;
* não criar uma nova janela.

Exemplo:

```text
02:00
↓
01:19
```

Segunda equipe conclui.

O relógio continua:

```text
01:19
01:18
01:17
...
```

A terceira equipe possui somente o tempo restante.

---

# Encerramento da fase

Se as três equipes concluírem antes de `00:00`:

* parar imediatamente o cronômetro;
* marcar a fase como encerrada;
* aguardar decisão do operador.

Não iniciar automaticamente a próxima fase.

Se o cronômetro chegar a:

```text
00:00
```

a fase termina.

Equipes que concluíram:

```text
CONCLUÍDO
```

Equipes que não concluíram:

```text
TEMPO ENCERRADO
```

Não aplicar automaticamente:

* penalidades;
* pontos;
* perda de pontos;
* conclusão da missão;
* qualquer outra regra.

---

# Status das equipes

Durante uma fase, uma equipe pode estar em:

```text
EM MISSÃO
CONCLUÍDO
TEMPO ENCERRADO
```

Na fase final também pode existir:

```text
CRISTAL ATIVADO
```

O status deve ser derivado do estado real da competição.

Não deve existir um seletor manual de status.

---

# Progressão dos cristais

Cada equipe possui um cristal próprio:

* Vermelho;
* Azul;
* Verde.

Os cristais utilizam a fase atual como referência para sua evolução energética.

Mapeamento:

```text
ENCONTRAR → estágio 1
PROTEGER  → estágio 2
LEVAR     → estágio 3
ATIVAR    → estágio 4
```

---

# Estrutura visual dos cristais

O cristal deve ser criado diretamente em código com:

* Three.js;
* React Three Fiber.

Não utilizar:

* Blender;
* modelos 3D externos obrigatórios.

A geometria deve possuir várias facetas para que a rotação seja facilmente percebida.

Os cristais precisam possuir:

* geometria facetada;
* contornos das faces;
* transparência;
* emissão;
* volume energético interno;
* quatro pontos internos de energia;
* veios ou rachaduras energéticas;
* Bloom;
* pulsação;
* rotação progressiva.

---

# Contornos do cristal

Os contornos das faces precisam ser claramente visíveis.

Mesmo regiões ainda não energizadas devem permanecer legíveis.

Região sem energia:

* contorno discreto;
* cor escura relacionada à equipe;
* baixa emissão.

Região energizada:

* contorno mais claro;
* emissão maior;
* maior resposta ao Bloom.

O objetivo é melhorar:

```text
silhueta
+
facetas
+
profundidade
+
percepção de giro
```

Não transformar o cristal em um wireframe grosseiro.

---

# Quatro pontos de energia

Cada cristal possui quatro núcleos luminosos internos.

Eles são marcos de progressão, não o efeito principal.

Distribuição:

```text
P4 — região superior
P3 — superior/intermediária
P2 — inferior/intermediária
P1 — região inferior
```

Progressão:

```text
ENCONTRAR → P1
PROTEGER  → P1 + P2
LEVAR     → P1 + P2 + P3
ATIVAR    → P1 + P2 + P3 + P4
```

Os pontos devem parecer fontes internas de energia, e não LEDs.

---

# Preenchimento energético

O principal indicador de progresso é o **volume do cristal energizado**.

A energia nasce na região inferior e sobe progressivamente.

Aproximação:

```text
ENCONTRAR → 25%
PROTEGER  → 50%
LEVAR     → 75%
ATIVAR    → 100%
```

A fronteira entre área energizada e não energizada não deve ser horizontal e perfeita.

Utilizar:

* irregularidade;
* noise;
* veios;
* variação entre faces.

O efeito deve parecer energia se propagando pelo material.

---

# Velocidade dos cristais

A velocidade de rotação aumenta conforme a fase.

Referência:

```text
ENCONTRAR → 1.0x
PROTEGER  → 1.35x
LEVAR     → 1.75x
ATIVAR    → 2.25x
```

A alteração de velocidade deve ser progressiva.

Não transformar o cristal em uma hélice.

A percepção do movimento deve vir de:

```text
facetas
+
contornos
+
luz
+
rotação
```

---

# Estado Ativar

Na fase `ATIVAR`, o cristal deve transmitir sobrecarga energética.

Utilizar de forma controlada:

* quatro pontos ativos;
* volume completamente energizado;
* veios luminosos;
* contornos fortes;
* emissão elevada;
* Bloom;
* pulsação;
* pequenos clarões internos;
* microvibração sutil.

Ainda deve ser possível distinguir:

* geometria;
* faces;
* profundidade;
* interior.

Não transformar o cristal em uma mancha de luz.

---

# Partículas

Partículas não são mais o principal recurso visual do cristal.

Durante funcionamento normal:

```text
quase nenhuma
```

Durante mudança de estado:

```text
poucas
```

Durante ativação e viagem:

```text
podem ser mais intensas
```

O cristal deve depender principalmente de:

```text
energia interna
+
facetas
+
contornos
+
veios
+
emissão
+
Bloom
```

---

# Ativação final

Na fase `ATIVAR`, quando uma equipe concluir sua ativação, seu cristal pode executar a sequência cinematográfica já prevista:

```text
sobrecarga
↓
desprendimento
↓
viagem
↓
impacto
↓
absorção pelo Núcleo Planetário
```

Essa animação deve utilizar a implementação existente com:

* GSAP;
* React Three Fiber;
* Three.js;
* Postprocessing.

---

# Núcleo Planetário

O Núcleo Planetário ocupa a área visual central da parte 3D do Display.

Ele deve possuir um estado inicial tecnológico e energético mesmo sem cristais.

Quando recebe cristais, precisa representar claramente quais equipes estão presentes.

---

# Energia armazenada no Núcleo

Não utilizar simplesmente uma troca de cor geral.

Cada energia precisa continuar reconhecível.

Estados possíveis:

```text
nenhum cristal
vermelho
azul
verde
vermelho + azul
vermelho + verde
azul + verde
vermelho + azul + verde
```

As energias podem aparecer através de:

* regiões internas;
* núcleos;
* veios;
* anéis;
* fluxos;
* setores;
* órbitas;
* pulsos.

As cores devem coexistir sem imediatamente se transformarem em uma única cor indefinida.

---

# Estado máximo do Núcleo

Com os três cristais:

* Vermelho;
* Azul;
* Verde;

o núcleo deve atingir seu estágio máximo.

Pode apresentar:

* emissão maior;
* movimento interno mais intenso;
* pulsação;
* Bloom;
* três energias visíveis;
* maior atividade orbital.

Ainda preservar a geometria.

---

# Display

Rota:

```text
/display
```

A tela é dividida conceitualmente em:

```text
ESQUERDA
PLACAR / INFORMAÇÃO

DIREITA
EXPERIÊNCIA VISUAL
```

A esquerda ocupa aproximadamente:

```text
42% – 45%
```

A direita:

```text
55% – 58%
```

---

# Placar

O lado esquerdo funciona como placar e ranking ao mesmo tempo.

Não manter cards redundantes mais ranking separado.

Cada equipe mostra:

* posição;
* nome;
* pontuação;
* status na fase atual.

Pontuação deve possuir grande destaque.

Exemplo conceitual:

```text
01
TITÃ VERMELHO

12.450
PTS

CONCLUÍDO
```

---

# Ranking

O ranking deriva automaticamente das pontuações.

Maior pontuação:

```text
1º
```

Não existe edição manual da posição.

Mudanças podem usar pequenas transições.

---

# Área visual

Na direita:

* três cristais;
* Núcleo Planetário;
* energia;
* animações.

Composição preferencial semelhante a:

```text
             VERMELHO
                 ◆

              NÚCLEO

         ◆                 ◆
       AZUL              VERDE
```

Não precisa seguir literalmente essa disposição, mas os três cristais precisam possuir relação espacial clara com o núcleo.

---

# Cronômetro no Display

Existe somente um cronômetro da fase.

Antes da primeira conclusão:

```text
FASE 02 — PROTEGER

TEMPO RESTANTE

04:31
```

Depois da primeira conclusão:

```text
JANELA FINAL

02:00
```

O mesmo relógio continua:

```text
01:59
01:58
...
```

A mudança visual deve informar claramente à plateia que uma equipe concluiu e começou a janela final.

---

# Fundo do Display

O fundo continua escuro, mas não deve esconder os cristais.

Utilizar uma composição baseada em:

```text
preto
+
azul petróleo muito escuro
+
ciano discreto
```

Pode usar:

* gradiente;
* haze;
* grid;
* vinheta;
* luz ambiente discreta.

O objetivo é aumentar a leitura de:

* contornos;
* silhuetas;
* facetas;
* profundidade.

---

# Logos

Exibir:

* Symbios;
* FIAP;
* Palo Alto Networks.

Symbios pode possuir maior destaque.

FIAP e Palo Alto funcionam como marcas institucionais.

---

# Admin

Rota:

```text
/admin
```

O Admin prioriza:

* rapidez;
* clareza;
* segurança operacional.

Não precisa reproduzir a complexidade visual do Display.

---

# Controle da fase

O Admin deve possuir uma área principal com:

```text
FASE ATUAL

02 — PROTEGER

TEMPO

06:30
```

Ações:

```text
INICIAR FASE
PAUSAR FASE
CONTINUAR FASE
```

A mudança para próxima fase é manual.

---

# Concluir missão

Cada equipe possui:

```text
CONCLUIR MISSÃO
```

Ao concluir:

1. marcar somente aquela equipe como concluída;
2. registrar sua conclusão;
3. se for a primeira conclusão da fase:

   * definir o relógio para `02:00`;
   * marcar `firstCompletionTriggered = true`;
4. se não for a primeira:

   * não alterar o relógio.

Cliques duplicados em uma equipe já concluída devem ser ignorados.

---

# Pontuação

O operador possui três formas de alterar pontos.

## 1. Botões rápidos positivos

```text
+100
+200
+300
```

## 2. Botões rápidos negativos

```text
-25
-100
-200
-300
```

## 3. Soma manual

Campo:

```text
ADICIONAR PONTOS

[ 175 ]

[ ADICIONAR ]
```

Funcionamento:

```ts
newScore = currentScore + enteredValue
```

Após aplicar, limpar o campo.

---

# Definir pontuação total

Manter também a opção já existente:

```text
DEFINIR TOTAL

[ 3250 ]

[ APLICAR ]
```

Funcionamento:

```ts
newScore = enteredValue
```

As funções:

```text
ADICIONAR PONTOS
```

e:

```text
DEFINIR TOTAL
```

devem ser visualmente diferentes para evitar erro operacional.

---

# Reset da arena

O reset é destrutivo.

Deve solicitar confirmação.

Deve restaurar:

* fase 1;
* timer `08:00`;
* firstCompletionTriggered = false;
* pontuações;
* status;
* ativações;
* estado dos cristais;
* estado do Núcleo Planetário.

---

# Histórico operacional

Manter histórico recente quando disponível.

Pode registrar:

* início da fase;
* pausa;
* continuação;
* pontuação;
* conclusão;
* mudança de fase;
* ativação;
* reset.

Usar localStorage.

Não utilizar banco.

---

# Persistência

Persistir via localStorage:

* fase atual;
* tempo restante;
* estado do cronômetro;
* firstCompletionTriggered;
* status das equipes;
* pontuações;
* cristais ativados;
* histórico recente.

Após refresh, restaurar o estado corretamente.

Não reproduzir animações cinematográficas já concluídas apenas por causa de refresh.

---

# Comunicação

Utilizar:

* Node.js;
* Socket.IO.

Fluxo:

```text
ADMIN
↓
estado/evento
↓
Socket.IO
↓
DISPLAY
```

Deve funcionar:

* no mesmo computador;
* em dois computadores na mesma rede local.

Sem internet.

---

# Stack

## Frontend

* React
* TypeScript
* Vite
* Zustand

## Visual

* Three.js
* React Three Fiber
* Drei
* React Postprocessing
* GSAP

## Comunicação

* Node.js
* Socket.IO

## Persistência

* localStorage

---

# Não utilizar

* banco de dados;
* Prisma;
* Firebase;
* serviços cloud;
* dependência de internet;
* Blender obrigatório;
* modelos 3D externos obrigatórios.

---

# Princípio visual

A interface deve seguir a linguagem Symbios:

* sci-fi;
* escura;
* tecnológica;
* energética;
* holográfica;
* alto contraste;
* azul/ciano estrutural;
* vermelho, azul e verde para as equipes.

Evitar aparência de dashboard empresarial convencional.

---

# Princípio operacional

O Admin deve exigir o mínimo possível de interpretação durante a arena.

O operador controla:

```text
fase
tempo
conclusões
pontuação
ativação
```

O sistema deve impedir ações duplicadas ou estados incoerentes sempre que possível.

---

# Fonte de verdade

Quando existir conflito entre:

* código legado;
* prompts anteriores;
* comentários antigos;
* decisões anteriores;

este arquivo `docs/PROJECT.md` representa a regra atual do projeto.

Não preserve comportamento antigo apenas porque já existe no código se ele contradizer este documento.
