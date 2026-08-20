# Symbios Arena

## Visão geral

O **Symbios Arena** é uma aplicação para controlar e exibir, em tempo real, uma competição presencial entre três equipes.

A experiência faz parte do universo **Symbios**, com estética sci-fi, tecnológica e pós-apocalíptica.

A aplicação possui duas telas:

* `/display` — painel exibido no telão da arena.
* `/admin` — painel utilizado pelo operador para controlar a competição.

O sistema deve funcionar totalmente em **localhost ou rede local**, sem depender de internet.

---

## Equipes

Existem três equipes:

* **Titã Vermelho**
* **Titã Azul**
* **Titã Verde**

Cada equipe possui:

* cor própria;
* pontuação;
* missão atual;
* cronômetro da missão atual;
* estado de progresso;
* cristal de energia próprio.

As equipes evoluem de forma independente. Portanto, cada equipe pode estar em uma missão diferente das demais ao mesmo tempo.

---

## Progressão

Cada equipe deve passar pelas seguintes etapas:

1. **Encontrar**
2. **Proteger**
3. **Levar**
4. **Ativar**

O cristal representa visualmente essa evolução.

Conforme a equipe avança, seu cristal deve ficar progressivamente mais energizado utilizando a cor da própria equipe.

Exemplo conceitual:

* Encontrar → pouca energia;
* Proteger → energia intermediária;
* Levar → cristal quase completo;
* Ativar → cristal totalmente energizado.

A evolução não deve ser apresentada apenas por uma barra de progresso. O próprio cristal deve comunicar visualmente o estágio da equipe.

---

## Cristais

Cada equipe possui um cristal independente.

Os cristais devem ser construídos diretamente em código com Three.js / React Three Fiber, sem depender de modelos criados em Blender ou outros softwares externos.

O visual deve explorar elementos como:

* transparência;
* brilho interno;
* emissão de luz;
* Bloom;
* partículas;
* pulsação;
* rotação sutil;
* linhas ou fluxos de energia;
* variação de intensidade de acordo com o progresso.

As cores principais são:

* Vermelho → Titã Vermelho;
* Azul → Titã Azul;
* Verde → Titã Verde.

O objetivo é obter aparência sci-fi e energética, evitando aspecto cartunesco ou de animação simples.

---

## Ativação final

Quando uma equipe concluir a etapa **Ativar**, deve existir uma animação especial.

Fluxo visual esperado:

1. o cristal começa a pulsar;
2. sua energia aumenta;
3. partículas e efeitos se intensificam;
4. o cristal se desprende da posição da equipe;
5. desloca-se em direção ao centro da tela;
6. chega ao Núcleo Planetário;
7. ocorre um impacto/pulso de energia;
8. o núcleo passa a representar a energia daquela equipe.

Essa animação será implementada com GSAP em conjunto com a cena Three.js.

Não é necessário que toda essa sequência exista na primeira versão do projeto.

---

# Display

Rota:

`/display`

Essa é a tela que será exibida no telão da arena.

Ela deve priorizar leitura à distância e impacto visual.

## Informações

O display deve apresentar:

* Titã Vermelho;
* Titã Azul;
* Titã Verde;
* cristal de cada equipe;
* pontuação de cada equipe;
* missão atual;
* cronômetro da missão atual;
* ranking;
* cronômetro geral da arena;
* Núcleo Planetário;
* identidade visual Symbios;
* logo FIAP;
* logo Palo Alto Networks.

---

## Organização visual

O painel não deve parecer um dashboard corporativo tradicional.

O elemento central da composição deve ser o **Núcleo Planetário**.

Os três cristais devem ser distribuídos ao redor ou em relação visual clara com o núcleo, permitindo que a futura animação de ativação faça sentido espacialmente.

Cada área de equipe deve permitir identificar rapidamente:

* equipe;
* cor;
* pontuação;
* missão;
* tempo;
* estágio do cristal.

O ranking deve estar sempre disponível, mas não deve competir visualmente com os cristais.

Os cristais são os principais elementos da experiência.

---

# Identidade visual

Utilizar como referência principalmente as páginas **3, 13 e 18** da proposta visual do Symbios.

## Página 3

Referência para:

* atmosfera;
* universo Symbios;
* cenário escuro;
* tecnologia;
* energia;
* contraste;
* identidade da marca.

## Página 13

Referência conceitual para o telão, contendo:

* ranking;
* tempo;
* missão atual;
* cristal como elemento visual dominante.

O layout não precisa ser copiado literalmente.

A nova aplicação precisa acomodar três cristais independentes e equipes que podem estar em missões diferentes.

## Página 18

Referência para a identidade das equipes:

* Titã Vermelho;
* Titã Azul;
* Titã Verde.

As cores das equipes devem aparecer principalmente através de energia, iluminação, cristal, detalhes da interface e efeitos visuais.

---

## Linguagem visual

Priorizar:

* fundo preto ou muito escuro;
* azul/ciano como linguagem tecnológica da interface;
* vermelho, azul e verde para diferenciação das equipes;
* luzes;
* partículas;
* elementos holográficos;
* linhas finas;
* transparências;
* painéis tecnológicos;
* profundidade;
* contraste alto.

Evitar:

* cards brancos;
* aparência de sistema administrativo no display;
* excesso de caixas;
* visual genérico de dashboard;
* elementos infantis;
* excesso de informação;
* animações exageradas acontecendo o tempo inteiro.

Os efeitos mais fortes devem ser reservados para acontecimentos importantes da competição.

---

# Admin

Rota:

`/admin`

O Admin é uma ferramenta operacional.

Ao contrário do Display, deve priorizar:

* velocidade;
* clareza;
* segurança;
* facilidade de operação.

Não precisa ter a mesma complexidade visual do telão.

---

## Controle por equipe

Para cada equipe, o operador deve conseguir controlar:

### Pontuação

* visualizar pontuação atual;
* definir pontuação manualmente;
* adicionar pontos;
* remover pontos.

### Missão

Selecionar individualmente:

* Encontrar;
* Proteger;
* Levar;
* Ativar.

A mudança da missão de uma equipe não pode alterar a missão das outras.

### Tempo da missão

Cada equipe possui um cronômetro independente para sua missão atual.

O operador deve conseguir:

* definir tempo;
* iniciar;
* pausar;
* continuar;
* resetar;
* ajustar quando necessário.

---

# Tempo geral

A arena possui também um cronômetro geral independente dos cronômetros das equipes.

O operador deve conseguir:

* definir o tempo inicial;
* iniciar;
* pausar;
* continuar;
* resetar;
* ajustar manualmente.

O Display deve refletir imediatamente essas alterações.

---

# Ranking

O ranking é calculado a partir da pontuação atual das três equipes.

Deve apresentar as equipes ordenadas da maior para a menor pontuação.

Quando houver mudança de posição, futuramente poderá existir uma pequena animação de transição.

O ranking não é editado diretamente.

Ele é consequência das pontuações definidas no Admin.

---

# Sincronização

Admin e Display devem compartilhar o mesmo estado da arena.

Fluxo esperado:

`Admin → estado da arena → Socket.IO → Display`

Uma alteração realizada no Admin deve aparecer imediatamente no Display sem necessidade de atualizar a página.

O sistema deve funcionar:

### Cenário 1

Duas abas ou janelas no mesmo computador.

### Cenário 2

Admin em um computador e Display em outro computador conectado à mesma rede local.

Nenhum dos dois cenários deve depender de internet.

---

# Persistência

Não utilizar banco de dados.

O estado necessário deve ser mantido de maneira simples através de:

* estado em memória durante a execução;
* localStorage no computador controlador.

O objetivo é evitar perda acidental das configurações caso a página do Admin seja atualizada.

---

# Estado da arena

O estado central deve representar aproximadamente:

```ts
Arena {
  generalTimer
  teams
}

Team {
  id
  name
  color
  score
  currentMission
  missionTimer
  crystalProgress
  activated
}
```

Os nomes e estruturas podem ser ajustados durante a implementação caso exista uma solução melhor.

---

# Tecnologias definidas

Frontend:

* React
* TypeScript
* Vite

Estado:

* Zustand

Visual 3D:

* Three.js
* React Three Fiber
* Drei

Efeitos:

* React Postprocessing

Animações:

* GSAP

Comunicação:

* Node.js
* Socket.IO

Persistência:

* localStorage

Não utilizar:

* banco de dados;
* Prisma;
* serviços cloud;
* dependência de internet;
* Blender;
* modelos 3D externos obrigatórios.

---

# Prioridades

A implementação deve acontecer incrementalmente.

## Prioridade 1 — funcionamento

Primeiro garantir:

* Admin funcional;
* Display funcional;
* comunicação entre ambos;
* equipes independentes;
* pontuação;
* missões;
* timers;
* ranking;
* persistência.

## Prioridade 2 — identidade visual

Depois:

* composição do Display;
* identidade Symbios;
* layout das equipes;
* núcleo central;
* integração dos logos.

## Prioridade 3 — cristais

Depois:

* geometria;
* materiais;
* iluminação;
* progresso;
* Bloom;
* partículas.

## Prioridade 4 — animações

Por último:

* transições;
* feedbacks;
* evolução energética;
* animação de ativação;
* deslocamento do cristal;
* reação do Núcleo Planetário.

---

# Princípio do projeto

A aplicação deve ser tecnicamente simples de operar, mas visualmente forte no telão.

A complexidade deve estar concentrada na experiência visual, e não na infraestrutura.

Sempre preferir uma implementação simples e controlável quando uma solução mais complexa não trouxer benefício visível para a experiência da arena.
