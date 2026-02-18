# ShiftBoard

App web para control y visualización semanal de turnos.

## Stack
- React + TypeScript + Vite
- Persistencia local en `localStorage`
- UI dashboard minimalista (cards + grid semanal)

## Ejecutar
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Funcionalidades
- Vista semanal Lun→Dom con eje de tiempo y zoom (30m, 1h, 2h, 3h, 4h, 6h)
- Cobertura visual por bloque horario + resumen por rol
- Filtros por rol/persona y modo “solo vacíos”
- Alta/edición/duplicado de turnos desde modal
- Datos demo automáticos al primer inicio
