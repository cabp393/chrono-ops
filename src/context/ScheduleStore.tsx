import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  loadSchedules,
  saveSchedules,
  SCHEDULE_STORAGE_KEYS,
  type ScheduleData
} from '../lib/scheduleStorage';
import { loadData, saveData } from '../lib/storage';
import { startOfWeekMonday } from '../lib/dateUtils';
import type { AppData, PersonSchedule, ScheduleOverride, ScheduleTemplate, Shift } from '../types';

type ScheduleStoreState = {
  appData: AppData;
  templates: ScheduleTemplate[];
  personSchedules: PersonSchedule[];
  overrides: ScheduleOverride[];
};

type SaveAllPayload = {
  templates: ScheduleTemplate[];
  personSchedules: PersonSchedule[];
  overrides: ScheduleOverride[];
};

type ScheduleStoreValue = ScheduleStoreState & {
  setShifts: (next: Shift[]) => void;
  setTemplates: (next: ScheduleTemplate[]) => void;
  setPersonSchedules: (next: PersonSchedule[]) => void;
  setOverrides: (next: ScheduleOverride[]) => void;
  saveAllSchedules: (payload: SaveAllPayload) => void;
};

type Action =
  | { type: 'setShifts'; payload: Shift[] }
  | { type: 'setTemplates'; payload: ScheduleTemplate[] }
  | { type: 'setPersonSchedules'; payload: PersonSchedule[] }
  | { type: 'setOverrides'; payload: ScheduleOverride[] }
  | { type: 'saveAllSchedules'; payload: SaveAllPayload }
  | { type: 'replaceSchedules'; payload: ScheduleData };

const todayWeekStart = startOfWeekMonday(new Date());

const buildInitialState = (): ScheduleStoreState => {
  const appData = loadData(todayWeekStart);
  const schedules = loadSchedules(appData.people);
  return {
    appData,
    templates: schedules.templates,
    personSchedules: schedules.personSchedules,
    overrides: schedules.overrides
  };
};

const reducer = (state: ScheduleStoreState, action: Action): ScheduleStoreState => {
  switch (action.type) {
    case 'setShifts':
      return { ...state, appData: { ...state.appData, shifts: action.payload } };
    case 'setTemplates':
      return { ...state, templates: action.payload };
    case 'setPersonSchedules':
      return { ...state, personSchedules: action.payload };
    case 'setOverrides':
      return { ...state, overrides: action.payload };
    case 'saveAllSchedules':
      return {
        ...state,
        templates: action.payload.templates,
        personSchedules: action.payload.personSchedules,
        overrides: action.payload.overrides
      };
    case 'replaceSchedules':
      return {
        ...state,
        templates: action.payload.templates,
        personSchedules: action.payload.personSchedules,
        overrides: action.payload.overrides
      };
    default:
      return state;
  }
};

const ScheduleStoreContext = createContext<ScheduleStoreValue | null>(null);

export const ScheduleStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  useEffect(() => {
    saveData(state.appData);
  }, [state.appData]);

  useEffect(() => {
    saveSchedules({
      templates: state.templates,
      personSchedules: state.personSchedules,
      overrides: state.overrides
    });
  }, [state.templates, state.personSchedules, state.overrides]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !SCHEDULE_STORAGE_KEYS.some((key) => key === event.key)) return;
      dispatch({ type: 'replaceSchedules', payload: loadSchedules(state.appData.people) });
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [state.appData.people]);

  const value = useMemo<ScheduleStoreValue>(() => ({
    ...state,
    setShifts: (next) => dispatch({ type: 'setShifts', payload: next }),
    setTemplates: (next) => dispatch({ type: 'setTemplates', payload: next }),
    setPersonSchedules: (next) => dispatch({ type: 'setPersonSchedules', payload: next }),
    setOverrides: (next) => dispatch({ type: 'setOverrides', payload: next }),
    saveAllSchedules: (payload) => dispatch({ type: 'saveAllSchedules', payload })
  }), [state]);

  return <ScheduleStoreContext.Provider value={value}>{children}</ScheduleStoreContext.Provider>;
};

export const useScheduleStore = () => {
  const ctx = useContext(ScheduleStoreContext);
  if (!ctx) throw new Error('useScheduleStore must be used within ScheduleStoreProvider');
  return ctx;
};
