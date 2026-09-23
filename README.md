# Symbios Arena

Aplicação local para controlar e exibir, em tempo real, a competição presencial entre as equipes Titã Vermelho, Titã Azul e Titã Verde.

O sistema funciona sem internet, em um único computador ou em máquinas conectadas à mesma rede local. O Admin concentra as ações do operador; o Display apresenta o placar, os cristais energéticos e o Núcleo Planetário em uma interface sci-fi para telões.

## Demonstração

### Display da arena

Ranking, fase atual, cronômetro compartilhado, status das equipes, cristais com carga progressiva e Núcleo Planetário em uma composição 16:9.

![Demonstração do Display da Symbios Arena](references/Painel.gif)

### Centro de comando

Controles para operar as fases, registrar conclusões, atualizar pontuações e ativar os cristais.

![Demonstração do Admin da Symbios Arena](references/Admin.gif)

## Interfaces

- `/admin`: centro de comando utilizado pelo operador.
- `/display`: painel principal exibido no telão.
- `/crystal`: laboratório isolado para avaliar cores e níveis de energia do componente `Crystal`.
- `/health`: verificação do servidor Socket.IO, disponível na porta `3001`.

## Regras implementadas

As três equipes disputam a mesma fase simultaneamente. Existe somente um cronômetro regressivo, compartilhado por todas elas:

| Fase | Missão | Duração |
| ---: | --- | ---: |
| 01 | Encontrar | `08:00` |
| 02 | Proteger | `06:30` |
| 03 | Levar | `06:30` |
| 04 | Ativar | `04:30` |

- Cada fase é preparada parada e precisa ser iniciada manualmente.
- A primeira equipe que conclui define o tempo restante em exatamente `02:00`, mesmo quando isso aumenta o relógio.
- A segunda conclusão não altera o tempo.
- A terceira conclusão encerra a fase imediatamente.
- Ao chegar a `00:00`, a fase termina e equipes pendentes recebem o status `TEMPO ENCERRADO`.
- O avanço para a próxima fase é sempre manual.
- Não existem timer geral, timers individuais ou avanço automático.

## Principais recursos

- Ranking ordenado automaticamente pela pontuação.
- Status independentes por equipe: `EM MISSÃO`, `CONCLUÍDO`, `TEMPO ENCERRADO` e `CRISTAL ATIVADO`.
- Atalhos de pontuação positivos e negativos, soma manual e definição de total.
- Cristais 3D gerados em código, sem modelos externos.
- Carga visual dos cristais baseada na fase compartilhada: 25%, 50%, 75% e 100%.
- Animação de ativação e convergência do cristal para o Núcleo Planetário.
- Energias vermelha, azul e verde preservadas separadamente dentro do núcleo.
- Sincronização em tempo real por Socket.IO e `BroadcastChannel`.
- Persistência do estado operacional no `localStorage` do Admin.
- Histórico recente e opção de desfazer a alteração de pontuação mais recente.

## Tecnologias

- React, TypeScript e Vite
- Zustand
- Node.js e Socket.IO
- React Three Fiber, Three.js e Drei
- React Postprocessing
- GSAP

Não há banco de dados, dependência de cloud, modelos 3D externos ou necessidade de internet durante a operação.

## Pré-requisitos

- Node.js 22 ou superior
- npm

## Como executar

Instale as dependências:

```powershell
npm.cmd install
```

Inicie o servidor Socket.IO e o front-end juntos:

```powershell
npm.cmd run dev
```

O terminal exibe os endereços do Admin e do Display para acesso local e pela rede. Em uma instalação padrão:

| Interface | Endereço local |
| --- | --- |
| Admin | `http://localhost:5173/admin` |
| Display | `http://localhost:5173/display` |
| Laboratório do cristal | `http://localhost:5173/crystal` |
| Status do Socket.IO | `http://localhost:3001/health` |

> A porta `3001` atende ao Socket.IO e à verificação de saúde. As interfaces visuais são servidas pelo Vite na porta `5173`.

Se aparecer `EADDRINUSE`, já existe outro processo utilizando a porta indicada. Encerre a instância anterior ou continue usando o processo que já está executando o projeto.

## Operação da arena

1. Abra o `/admin` no computador controlador.
2. Abra o `/display` no telão ou em outra máquina da mesma rede.
3. Confirme que a Fase 01 — Encontrar está preparada com `08:00`.
4. Clique em **Iniciar fase**.
5. Use **Concluir missão** para registrar cada equipe. A primeira conclusão abre a janela final de `02:00`.
6. Quando as três equipes concluírem ou o tempo zerar, prepare manualmente a próxima fase.
7. Clique novamente em **Iniciar fase**; a preparação nunca inicia o cronômetro automaticamente.
8. Na fase Ativar, confirme cada ativação para iniciar a convergência do respectivo cristal ao núcleo.

O Admin é a fonte das alterações manuais. Pontuação, fase, tempo, conclusões e ativações são transmitidos imediatamente aos displays conectados.

### Pontuação

O Admin oferece quatro grupos de controles:

- atalhos positivos: `+100`, `+200` e `+300`;
- atalhos negativos: `-25`, `-100`, `-200` e `-300`;
- **Adicionar pontos**, que soma o valor digitado à pontuação atual;
- **Definir total**, que substitui a pontuação pelo valor digitado.

## Persistência e sincronização

O computador com o Admin persiste no `localStorage`:

- fase e tempo restante;
- estado iniciado, pausado ou encerrado;
- disparo da janela final;
- conclusões e ativações das equipes;
- pontuações;
- histórico operacional.

Ao atualizar o Display, ele solicita o estado vigente ao Admin/servidor. Ativações antigas são restauradas sem repetir a animação cinematográfica.

Em duas abas do mesmo navegador, `BroadcastChannel` funciona como contingência local. Entre computadores, a sincronização ocorre pelo Socket.IO.

## Uso na rede local

Mantenha `npm.cmd run dev` em execução no computador servidor. Nos outros dispositivos da mesma rede, use os endereços exibidos no terminal, por exemplo:

```text
http://192.168.x.x:5173/display
```

O Display conecta-se ao Socket.IO usando o mesmo IP na porta `3001`. Portanto, as portas `5173` e `3001` precisam estar acessíveis na rede local.

## Comandos disponíveis

```powershell
npm.cmd run dev       # inicia Socket.IO e Vite juntos
npm.cmd run dev:web   # inicia somente o Vite
npm.cmd run server    # inicia somente o Socket.IO na porta 3001
npm.cmd run build     # verifica TypeScript e gera o build de produção
npm.cmd run preview   # serve o build gerado
```

Para executar a suíte automatizada:

```powershell
node --import tsx --test tests/*.test.ts
```

## Estrutura principal

```text
src/
  animations/   Transições de energia e ativação
  components/   Componentes visuais e operacionais reutilizáveis
  hooks/        Integração do React com a sincronização da arena
  lib/          Regras de operação, transporte e utilitários
  pages/        Rotas /admin, /display e /crystal
  scenes/       Cenas React Three Fiber
  store/        Estado global Zustand e persistência
  types/        Tipos da arena e dos eventos
server/         Servidor Socket.IO local
references/     Referências visuais e demonstrações em GIF
docs/           Documentação e materiais do projeto
tests/          Testes de regras, sincronização e componentes visuais
```

## Cristais e Núcleo Planetário

O componente reutilizável `Crystal` recebe cor, progresso normalizado e estado de ativação. Sua geometria facetada é construída com `THREE.BufferGeometry`; shaders, material translúcido, emissão, veios, fontes internas, rotação e Bloom comunicam o nível energético.

Os três cristais compartilham uma única cena. A fase atual determina o mesmo estágio de carga para todos, enquanto cor, conclusão e ativação continuam pertencendo a cada equipe.

O Núcleo Planetário mantém canais separados para as energias vermelha, azul e verde. Isso permite representar nenhum, um, dois ou os três cristais armazenados sem reduzir o resultado a uma mistura uniforme de cores.

## Documentação adicional

- [Visão completa do produto](docs/PROJECT.md)
- [Proposta visual da arena](docs/Proposta_Arena_NEXT_2026_Symbios_Rev4.pdf)
