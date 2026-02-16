import { createDefaultPlan, normalizeImportedPlan } from './engine.js';

const PLAN_KEY = 'chronoops.calendarPlan.v1';

export function loadPlan() {
  const raw = localStorage.getItem(PLAN_KEY);
  if (!raw) return createDefaultPlan();
  try {
    return normalizeImportedPlan(JSON.parse(raw));
  } catch {
    return createDefaultPlan();
  }
}

export function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function exportPlan(plan) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    plan
  };
}

export function importPlan(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('JSON inválido');
  }

  const maybePlan = payload.plan ?? payload;
  const normalized = normalizeImportedPlan(maybePlan);
  savePlan(normalized);
  return normalized;
}
