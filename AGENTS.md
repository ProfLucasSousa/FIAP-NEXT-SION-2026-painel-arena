# Symbios Arena

## Stack

- React + TypeScript + Vite
- React Three Fiber + Three.js + Drei
- React Postprocessing
- GSAP
- Zustand
- Node.js + Socket.IO
- localStorage
- CSS/Tailwind

## Architecture

- One React application with `/display` and `/admin`.
- Must work fully offline over localhost or local network.
- No database.
- No cloud dependency.
- No Blender or externally created 3D models.
- Crystal geometry and visual effects must be generated in code.
- Admin is the source of manual game-state changes.
- Socket.IO synchronizes admin and display.
- localStorage persists state on the controller machine.

## Development rules

- Keep components small and reusable.
- Keep game state separate from presentation.
- Keep animations separate from business logic.
- Prefer TypeScript types for all game state and socket events.
- Do not add dependencies unless they solve a concrete need.
- Run the application after meaningful changes and fix errors before continuing.
