# Symbios Arena

Aplicação local para controle e exibição de uma competição presencial entre os times Titã Vermelho, Titã Azul e Titã Verde.

O projeto possui dois modos sincronizados em tempo real:

- `/admin`: centro de comando usado pelo operador para atualizar pontuação, missão, cronômetros e ativação de cristal.
- `/display`: telão da arena com ranking, status das equipes, tempo geral e Núcleo Planetário.

Também há uma rota de avaliação visual do cristal gerado em código:

- `/crystal`: laboratório isolado do componente 3D, com seleção de cor e nível de energia.

## Tecnologias

- React + TypeScript + Vite
- Zustand e `localStorage` para estado local
- Node.js + Socket.IO para sincronização na rede local
- React Three Fiber + Three.js + React Postprocessing para o cristal 3D

Não há banco de dados, dependência de cloud, modelos 3D externos ou necessidade de internet durante a execução.

## Pré-requisitos

- Node.js 22 ou superior
- npm

## Como executar

Instale as dependências uma única vez:

```powershell
npm.cmd install
```

Inicie o ambiente local completo. Esse comando sobe o Socket.IO e o front-end juntos:

```powershell
npm.cmd run dev
```

Depois, abra no navegador:

| Interface | Endereço local |
| --- | --- |
| Admin | `http://localhost:5173/admin` |
| Display | `http://localhost:5173/display` |
| Laboratório do cristal | `http://localhost:5173/crystal` |
| Status do Socket.IO | `http://localhost:3001/health` |

> A porta `3001` é destinada ao Socket.IO, não à interface visual. Não abra `http://0.0.0.0:3001`: esse é apenas o endereço de escuta do servidor.

## Uso na rede local

Com os dois processos em execução, descubra o IP local da máquina que iniciou os servidores. Nos outros computadores da mesma rede, substitua `localhost` por esse IP:

```text
http://192.168.x.x:5173/display
```

O Admin é a fonte das alterações manuais. Cada alteração é enviada pelo Socket.IO para os displays conectados; o estado também é persistido no `localStorage` do computador controlador.

Em duas abas no mesmo computador, um canal local do navegador mantém Admin e Display sincronizados como contingência. Em computadores diferentes, a sincronização continua sendo feita pelo Socket.IO.

## Comandos disponíveis

```powershell
npm.cmd run dev       # inicia Socket.IO e Vite juntos
npm.cmd run dev:web   # inicia somente o Vite (uso avançado)
npm.cmd run server    # inicia o Socket.IO na porta 3001
npm.cmd run build     # verifica TypeScript e gera o build de produção
npm.cmd run preview   # serve o build gerado
```

## Estrutura principal

```text
src/
  components/   Componentes visuais reutilizáveis, incluindo Crystal
  hooks/        Sincronização do estado com Socket.IO
  lib/          Cliente Socket.IO e utilitários
  pages/        Rotas /admin, /display e /crystal
  scenes/       Cenas isoladas React Three Fiber
  store/        Estado global Zustand
  types/        Tipos de Arena, Team, Mission e Timer
server/         Servidor Socket.IO local
```

## Cristal 3D

O componente `Crystal` recebe `color` e `progress` entre `0` e `1`. Sua geometria facetada é construída com `THREE.BufferGeometry`; o progresso controla emissão, transparência, luz interna e intensidade de Bloom. Os três cristais compartilham uma única cena no Display e convergem para o Núcleo Planetário durante a ativação.
