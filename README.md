# Chrono Ops Planner (React + LocalStorage)

Aplicación front-end (sin backend) para planificar turnos y comparar escenarios.

## Stack

- React 18 + Vite.
- Persistencia **únicamente en LocalStorage**.
- Core engine separado de la UI (`src/engine.js`) con funciones deterministas.
- Lista para despliegue en Vercel como proyecto estático.

## Módulos funcionales

- Scenario Builder
- Workforce & Areas
- Shift Models Library
- Generator / Optimizer
- Visualizer
- Compare

## Ejecutar localmente

```bash
npm install
npm run dev
```

## Build para producción

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```
