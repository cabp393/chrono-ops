# Chrono Ops Planner (LocalStorage only)

Aplicación front-end (sin backend) para planificar turnos y comparar escenarios.

## Principios implementados

- Persistencia **únicamente en LocalStorage**.
- Core engine separado de la UI (`src/engine.js`) con funciones deterministas.
- Flujo por módulos:
  - Scenario Builder
  - Workforce & Areas
  - Shift Models Library
  - Generator / Optimizer
  - Visualizer
  - Compare

## Ejecutar

Como es una app estática, puedes abrir `index.html` en navegador o levantar un servidor local:

```bash
python -m http.server 4173
```

## Tests

```bash
npm test
```
