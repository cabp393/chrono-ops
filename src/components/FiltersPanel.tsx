import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { TIME_SCALE_OPTIONS, scaleLabel } from '../lib/timeScale';
import type { AppliedViewState, Function, Person, Role, ShiftLabelMode, TimeScale } from '../types';
import { FilterFooter } from './filters/FilterFooter';
import { FilterPill } from './filters/FilterPill';
import { FilterSection } from './filters/FilterSection';
import { TimeInput24 } from './TimeInput24';

type Props = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  appliedState: AppliedViewState;
  open: boolean;
  onClose: () => void;
  onApply: (nextState: AppliedViewState) => void;
  onReset: () => void;
};

const DEFAULT_VIEW_STATE: AppliedViewState = {
  timeScale: 60,
  shiftLabelMode: 'function',
  searchText: '',
  selectedPersonId: null,
  roleIds: [],
  functionIds: [],
  dayKeys: [],
  timeRangeStart: '',
  timeRangeEnd: ''
};

const DAY_FILTER_OPTIONS: Array<{ key: AppliedViewState['dayKeys'][number]; short: string }> = [
  { key: 'mon', short: 'Lun' },
  { key: 'tue', short: 'Mar' },
  { key: 'wed', short: 'Mié' },
  { key: 'thu', short: 'Jue' },
  { key: 'fri', short: 'Vie' },
  { key: 'sat', short: 'Sáb' },
  { key: 'sun', short: 'Dom' }
];

const norm = (value: string) => value.trim().toLowerCase();

export const FiltersPanel = ({
  roles,
  functions,
  people,
  appliedState,
  open,
  onClose,
  onApply,
  onReset
}: Props) => {
  const [draftState, setDraftState] = useState<AppliedViewState>(appliedState);

  useEffect(() => {
    if (open) setDraftState(appliedState);
  }, [appliedState, open]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', open);
    return () => document.body.classList.remove('drawer-open');
  }, [open]);

  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const draftSearch = norm(draftState.searchText);
  const roleScope = draftState.roleIds.length > 0 ? new Set(draftState.roleIds) : null;
  const isSearchMode = draftSearch.length > 0;

  const peopleMatchingSearch = useMemo(() => {
    if (!draftSearch) return people;
    return people.filter((person) => person.nombre.toLowerCase().includes(draftSearch));
  }, [draftSearch, people]);

  const peoplePickerItems = useMemo(() => {
    if (!isSearchMode) return [];
    return people
      .filter((person) => person.nombre.toLowerCase().includes(draftSearch))
      .sort((a, b) => {
        const aName = a.nombre.toLowerCase();
        const bName = b.nombre.toLowerCase();
        const aStarts = aName.startsWith(draftSearch);
        const bStarts = bName.startsWith(draftSearch);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return aName.localeCompare(bName, 'es');
      });
  }, [isSearchMode, people, draftSearch]);

  useEffect(() => {
    if (!isSearchMode) {
      setDraftState((prev) => prev.selectedPersonId === null ? prev : { ...prev, selectedPersonId: null });
      return;
    }
    const firstMatchId = peoplePickerItems[0]?.id ?? null;
    setDraftState((prev) => prev.selectedPersonId === firstMatchId ? prev : { ...prev, selectedPersonId: firstMatchId });
  }, [isSearchMode, peoplePickerItems]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    peopleMatchingSearch.forEach((person) => {
      counts[person.roleId] = (counts[person.roleId] || 0) + 1;
    });
    return counts;
  }, [peopleMatchingSearch]);

  const functionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    peopleMatchingSearch.forEach((person) => {
      functions.filter((fn) => fn.roleId === person.roleId).forEach((fn) => {
        counts[fn.id] = (counts[fn.id] || 0) + 1;
      });
    });
    return counts;
  }, [peopleMatchingSearch, functions]);

  const visibleRoleIds = roleScope ? Array.from(roleScope) : roles.map((role) => role.id);
  const roleRank = useMemo(() => new Map(roles.map((role, index) => [role.id, index])), [roles]);
  const visibleFunctions = useMemo(() => (
    functions
      .filter((fn) => visibleRoleIds.includes(fn.roleId))
      .sort((a, b) => {
        const roleDiff = (roleRank.get(a.roleId) ?? Number.MAX_SAFE_INTEGER) - (roleRank.get(b.roleId) ?? Number.MAX_SAFE_INTEGER);
        if (roleDiff !== 0) return roleDiff;
        return a.nombre.localeCompare(b.nombre, 'es');
      })
  ), [functions, visibleRoleIds, roleRank]);
  const hasUnsavedChanges = JSON.stringify(draftState) !== JSON.stringify(appliedState);

  const toggleRole = (id: string) => {
    setDraftState((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(id) ? prev.roleIds.filter((item) => item !== id) : [...prev.roleIds, id]
    }));
  };

  const toggleFunction = (id: string) => {
    setDraftState((prev) => ({
      ...prev,
      functionIds: prev.functionIds.includes(id) ? prev.functionIds.filter((item) => item !== id) : [...prev.functionIds, id]
    }));
  };

  const toggleDay = (dayKey: AppliedViewState['dayKeys'][number]) => {
    setDraftState((prev) => ({
      ...prev,
      dayKeys: prev.dayKeys.includes(dayKey) ? prev.dayKeys.filter((item) => item !== dayKey) : [...prev.dayKeys, dayKey]
    }));
  };

  const closeWithoutApply = () => {
    setDraftState(appliedState);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="filters-drawer" role="presentation">
      <button type="button" className="filters-overlay" aria-label="Cerrar panel de filtros" onClick={closeWithoutApply} />

      <aside className="filters-panel open" role="dialog" aria-modal="true" aria-label="Panel de filtros" onClick={(event) => event.stopPropagation()}>
        <div className="filters-head">
          <h3>Panel</h3>
          {hasUnsavedChanges && <span className="pending-badge">Cambios sin aplicar</span>}
          <button type="button" className="ghost" onClick={closeWithoutApply}>Cerrar</button>
        </div>

        <div className="filters-scroll">
          {isSearchMode ? null : (
            <>
              <FilterSection title="Opciones de visualización">
                <div className="sub-control">
                  <p>Duración de bloque</p>
                  <div className="pill-grid">
                    {TIME_SCALE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`filter-pill ${draftState.timeScale === option ? 'active' : ''}`}
                        onClick={() => setDraftState((prev) => ({ ...prev, timeScale: option as TimeScale }))}
                      >
                        <span>{scaleLabel(option).replace(' min', 'm').replace(' h', 'h')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sub-control">
                  <p>Texto en turnos</p>
                  <div className="pill-grid">
                    <button
                      type="button"
                      className={`filter-pill ${draftState.shiftLabelMode === 'person' ? 'active' : ''}`}
                      onClick={() => setDraftState((prev) => ({ ...prev, shiftLabelMode: 'person' as ShiftLabelMode }))}
                    >
                      <span>Nombre</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${draftState.shiftLabelMode === 'function' ? 'active' : ''}`}
                      onClick={() => setDraftState((prev) => ({ ...prev, shiftLabelMode: 'function' as ShiftLabelMode }))}
                    >
                      <span>Función</span>
                    </button>
                  </div>
                </div>
              </FilterSection>

              <FilterSection title="Filtros">
                <div className="sub-control">
                  <p>Rol</p>
                  <div className="pill-grid">
                    {roles.map((role) => (
                      <FilterPill
                        key={role.id}
                        label={role.nombre}
                        count={roleCounts[role.id] || 0}
                        color={role.color}
                        active={draftState.roleIds.includes(role.id)}
                        onClick={() => toggleRole(role.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="sub-control">
                  <p>Función</p>
                  <div className="pill-grid">
                    {visibleFunctions.map((fn) => (
                      <FilterPill
                        key={fn.id}
                        label={fn.nombre}
                        count={functionCounts[fn.id] || 0}
                        color={rolesById.get(fn.roleId)?.color}
                        active={draftState.functionIds.includes(fn.id)}
                        onClick={() => toggleFunction(fn.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="sub-control">
                  <p>Día</p>
                  <div className="pill-grid">
                    {DAY_FILTER_OPTIONS.map((day) => {
                      const active = draftState.dayKeys.includes(day.key);
                      return (
                        <button
                          key={day.key}
                          type="button"
                          className={`filter-pill day-pill ${active ? 'active' : ''}`}
                          onClick={() => toggleDay(day.key)}
                        >
                          <span>{day.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sub-control">
                  <p>Rango horario</p>
                  <div className="time-range-grid">
                    <label>
                      <span>Desde</span>
                      <TimeInput24 value={draftState.timeRangeStart} onChange={(value) => setDraftState((prev) => ({ ...prev, timeRangeStart: value }))} />
                    </label>
                    <label>
                      <span>Hasta</span>
                      <TimeInput24 value={draftState.timeRangeEnd} onChange={(value) => setDraftState((prev) => ({ ...prev, timeRangeEnd: value }))} />
                    </label>
                  </div>
                </div>
              </FilterSection>
            </>
          )}
        </div>

        <FilterFooter
          searchText={draftState.searchText}
          onSearchChange={(value) => setDraftState((prev) => ({ ...prev, searchText: value }))}
          onSearchClear={() => setDraftState((prev) => ({ ...prev, searchText: '', selectedPersonId: null }))}
          searchPicker={isSearchMode ? (
            <div className="search-picker-grid pill-grid">
              {peoplePickerItems.map((person) => {
                const roleColor = rolesById.get(person.roleId)?.color;
                const selected = draftState.selectedPersonId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    className={`filter-pill ${selected ? 'active' : ''}`}
                    onClick={() => setDraftState((prev) => ({ ...prev, selectedPersonId: person.id }))}
                    style={roleColor ? ({ '--pill-color': roleColor } as CSSProperties) : undefined}
                  >
                    {roleColor ? <span className="pill-dot" style={{ background: roleColor }} /> : null}
                    <span>{person.nombre}</span>
                  </button>
                );
              })}
              {peoplePickerItems.length === 0 ? <p className="empty-state">Sin resultados por nombre.</p> : null}
            </div>
          ) : null}
          disabledApply={!hasUnsavedChanges}
          onApply={() => {
            onApply(draftState);
            onClose();
          }}
          onReset={() => {
            setDraftState(DEFAULT_VIEW_STATE);
            onReset();
            onClose();
          }}
        />
      </aside>
    </div>
  );
};
