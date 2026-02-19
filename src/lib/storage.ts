import type { AppliedViewState, ShiftLabelMode, TimeScale } from '../types';
import { clampScale } from './timeScale';

const VIEW_SCALE_KEY = 'shiftboard:view:timeScale';
const SHIFT_LABEL_MODE_KEY = 'shiftboard:view:shiftLabelMode';
const VIEW_STATE_KEY = 'shiftboard:view:state:v1';

export const loadTimeScalePreference = (): TimeScale => {
  const raw = localStorage.getItem(VIEW_SCALE_KEY);
  if (!raw) return 60;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 60;
  return clampScale(parsed);
};

export const saveTimeScalePreference = (scale: TimeScale) => {
  localStorage.setItem(VIEW_SCALE_KEY, String(scale));
};

export const loadShiftLabelModePreference = (): ShiftLabelMode => {
  const raw = localStorage.getItem(SHIFT_LABEL_MODE_KEY);
  if (raw === 'person' || raw === 'function') return raw;
  return 'function';
};

export const saveShiftLabelModePreference = (mode: ShiftLabelMode) => {
  localStorage.setItem(SHIFT_LABEL_MODE_KEY, mode);
};

const normalizeViewState = (value: Partial<AppliedViewState> | null | undefined): AppliedViewState => ({
  timeScale: clampScale(Number(value?.timeScale ?? 60)),
  shiftLabelMode: value?.shiftLabelMode === 'person' ? 'person' : 'function',
  roleIds: Array.isArray(value?.roleIds) ? value!.roleIds.filter((item): item is string => typeof item === 'string') : [],
  functionIds: Array.isArray(value?.functionIds) ? value!.functionIds.filter((item): item is string => typeof item === 'string') : [],
  searchText: typeof value?.searchText === 'string' ? value.searchText : ''
});

export const loadViewStatePreference = (): AppliedViewState => {
  const raw = localStorage.getItem(VIEW_STATE_KEY);
  if (raw) {
    try {
      return normalizeViewState(JSON.parse(raw) as Partial<AppliedViewState>);
    } catch {
      return normalizeViewState(null);
    }
  }

  return normalizeViewState({
    timeScale: loadTimeScalePreference(),
    shiftLabelMode: loadShiftLabelModePreference()
  });
};

export const saveViewStatePreference = (state: AppliedViewState) => {
  const normalized = normalizeViewState(state);
  localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(normalized));
  saveTimeScalePreference(normalized.timeScale);
  saveShiftLabelModePreference(normalized.shiftLabelMode);
};
