import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { TIME_SCALE_OPTIONS, scaleLabel } from '../lib/timeScale';
import type { AppliedViewState, Function, Person, Role, ShiftLabelMode, TimeScale } from '../types';
import { FilterFooter } from './filters/FilterFooter';
import { FilterPill } from './filters/FilterPill';
import { FilterSection } from './filters/FilterSection';

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
  functionIds: []
};

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

  const functionsById = useMemo(() => new Map(functions.map((fn) => [fn.id, fn])), [functions]);
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

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    peopleMatchingSearch.forEach((person) => {
      const fn = functionsById.get(person.functionId);
      if (!fn) return;
      counts[fn.roleId] = (counts[fn.roleId] || 0) + 1;
    });
    return counts;
  }, [peopleMatchingSearch, functionsById]);

  const functionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    peopleMatchingSearch.forEach((person) => {
      counts[person.functionId] = (counts[person.functionId] || 0) + 1;
    });
    return counts;
  }, [peopleMatchingSearch]);

  const groupedFunctions = useMemo(() => {
    const byRole: Record<string, Function[]> = {};
    functions.forEach((fn) => {
      byRole[fn.roleId] = byRole[fn.roleId] || [];
      byRole[fn.roleId].push(fn);
    });
    return byRole;
  }, [functions]);

  const visibleRoleIds = roleScope ? Array.from(roleScope) : roles.map((role) => role.id);
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
          {isSearchMode ? (
            <FilterSection title="Trabajadores">
              <div className="pill-grid">
                {peoplePickerItems.map((person) => {
                  const roleColor = rolesById.get(functionsById.get(person.functionId)?.roleId ?? '')?.color;
                  const selected = draftState.selectedPersonId === person.id;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      className={`filter-pill ${selected ? 'active' : ''}`}
                      onClick={() => setDraftState((prev) => ({
                        ...prev,
                        selectedPersonId: prev.selectedPersonId === person.id ? null : person.id
                      }))}
                      style={roleColor ? ({ '--pill-color': roleColor } as CSSProperties) : undefined}
                    >
                      {roleColor ? <span className="pill-dot" style={{ background: roleColor }} /> : null}
                      <span>{person.nombre}</span>
                    </button>
                  );
                })}
                {peoplePickerItems.length === 0 ? <p className="empty-state">Sin resultados por nombre.</p> : null}
              </div>
            </FilterSection>
          ) : (
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
                  <div className="function-groups">
                    {visibleRoleIds.map((roleId) => {
                      const role = roles.find((item) => item.id === roleId);
                      const items = groupedFunctions[roleId] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={roleId} className="function-group">
                          <p>{role?.nombre ?? roleId}</p>
                          <div className="pill-grid">
                            {items.map((fn) => (
                              <FilterPill
                                key={fn.id}
                                label={fn.nombre}
                                count={functionCounts[fn.id] || 0}
                                color={role?.color}
                                active={draftState.functionIds.includes(fn.id)}
                                onClick={() => toggleFunction(fn.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FilterSection>
            </>
          )}
        </div>

        <FilterFooter
          searchText={draftState.searchText}
          onSearchChange={(value) => setDraftState((prev) => ({ ...prev, searchText: value }))}
          onSearchClear={() => setDraftState((prev) => ({ ...prev, searchText: '' }))}
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
