# Symbios Arena

Aplicação local para controlar e exibir, em tempo real, uma competição presencial entre as equipes Titã Vermelho, Titã Azul e Titã Verde.

O sistema foi pensado para operar sem internet, em um único computador ou em diferentes máquinas conectadas à mesma rede local. O Admin concentra as ações do operador e o Display transforma o estado da arena em uma experiência visual sci-fi com cristais energéticos e um Núcleo Planetário.

## Demonstração

### Display da arena

Ranking, cronômetro geral, informações das três equipes, cristais com carga progressiva e Núcleo Planetário em uma composição voltada para telões 16:9.

![Demonstração do Display da Symbios Arena](references/Painel.gif)

### Centro de comando

Controles operacionais para iniciar e pausar a arena, atualizar pontuações, controlar missões e cronômetros e ativar os cristais.

![Demonstração do Admin da Symbios Arena](references/Admin.gif)

## Interfaces

- `/admin`: centro de comando utilizado pelo operador.
- `/display`: painel principal exibido no telão da arena.
- `/crystal`: laboratório isolado para avaliar cores e níveis de energia do componente `Crystal`.
- `/health`: verificação do servidor Socket.IO, disponível na porta `3001`.

## Principais recursos

- Três equipes com pontuação, missão e cronômetro independentes.
- Cronômetro geral com início, pausa e retomada coordenados.
- Ranking calculado automaticamente a partir das pontuações.
- Cristais 3D gerados em código, sem modelos externos.
- Evolução visual da energia conforme cada missão é concluída.
- Animação de ativação e convergência do cristal para o Núcleo Planetário.
- Sincronização em tempo real por Socket.IO e `BroadcastChannel`.
- Persistência do estado operacional no `localStorage` do Admin.
- Histórico recente de ações e desfazer para operações compatíveis.

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

O terminal exibirá os endereços disponíveis para acesso local e pela rede. Em uma instalação padrão:

| Interface | Endereço local |
| --- | --- |
| Admin | `http://localhost:5173/admin` |
| Display | `http://localhost:5173/display` |
| Laboratório do cristal | `http://localhost:5173/crystal` |
| Status do Socket.IO | `http://localhost:3001/health` |

> A porta `3001` atende ao Socket.IO e à verificação de saúde. As interfaces visuais são servidas pelo Vite na porta `5173`.

## Operação da arena

1. Abra o `/admin` no computador controlador.
2. Abra o `/display` no telão ou em outra máquina da mesma rede.
3. Use **Iniciar arena** para iniciar o tempo geral e as três equipes na missão Encontrar.
4. Ao concluir uma missão, o cronômetro da equipe para e seu cristal recebe o próximo nível de carga.
5. Selecione manualmente a próxima missão e inicie seu cronômetro quando a equipe estiver pronta.
6. Na missão Ativar, confirme a ativação para iniciar a convergência do cristal ao núcleo.

O Admin é a fonte das alterações manuais. Cada ação é transmitida imediatamente aos displays conectados e as equipes continuam evoluindo de forma independente.

## Uso na rede local

Mantenha o comando `npm.cmd run dev` em execução no computador servidor. Nos outros computadores da mesma rede, use os endereços de rede apresentados no terminal, por exemplo:

```text
http://192.168.x.x:5173/display
```

O navegador do Display também se conecta ao Socket.IO usando o mesmo IP na porta `3001`. Portanto, as duas portas precisam estar acessíveis na rede local.

Em duas abas do mesmo navegador, um canal local mantém Admin e Display sincronizados como contingência. Entre computadores diferentes, a comunicação ocorre pelo Socket.IO.

## Comandos disponíveis

```powershell
npm.cmd run dev       # inicia Socket.IO e Vite juntos
npm.cmd run dev:web   # inicia somente o Vite
npm.cmd run server    # inicia somente o Socket.IO na porta 3001
npm.cmd run build     # verifica TypeScript e gera o build de produção
npm.cmd run preview   # serve o build gerado
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
```

## Cristal 3D

O componente reutilizável `Crystal` recebe cor, progresso normalizado e estado de ativação. Sua geometria facetada é construída com `THREE.BufferGeometry`, enquanto shaders, emissão, luz interna, partículas, rotação e Bloom representam o nível de energia.

Cada cristal reage apenas ao estado da própria equipe. A conclusão de uma missão aumenta a carga visual; selecionar a missão seguinte preserva a energia conquistada. Os três cristais compartilham uma única cena no Display.

## Documentação adicional

- [Visão completa do produto](docs/PROJECT.md)
- [Proposta visual da arena](docs/Proposta_Arena_NEXT_2026_Symbios_Rev4.pdf)
