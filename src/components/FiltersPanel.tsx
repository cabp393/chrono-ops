import { useEffect, useMemo, useState } from 'react';
import { TIME_SCALE_OPTIONS, scaleLabel } from '../lib/timeScale';
import type { AppliedFilters, Function, Person, Role, ShiftLabelMode, TimeScale } from '../types';
import { FilterFooter } from './filters/FilterFooter';
import { FilterPill } from './filters/FilterPill';
import { FilterSection } from './filters/FilterSection';

type Props = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  appliedFilters: AppliedFilters;
  scale: TimeScale;
  shiftLabelMode: ShiftLabelMode;
  open: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  onResetFilters: () => void;
  onShiftLabelModeChange: (mode: ShiftLabelMode) => void;
  onScaleChange: (value: TimeScale) => void;
};

const EMPTY_FILTERS: AppliedFilters = { searchText: '', roleIds: [], functionIds: [] };
const norm = (value: string) => value.trim().toLowerCase();

export const FiltersPanel = ({
  roles,
  functions,
  people,
  appliedFilters,
  scale,
  shiftLabelMode,
  open,
  onClose,
  onApplyFilters,
  onResetFilters,
  onShiftLabelModeChange,
  onScaleChange
}: Props) => {
  const [draft, setDraft] = useState<AppliedFilters>(appliedFilters);

  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', open);
    return () => document.body.classList.remove('drawer-open');
  }, [open]);

  const functionsById = useMemo(() => new Map(functions.map((fn) => [fn.id, fn])), [functions]);

  const draftSearch = norm(draft.searchText);
  const roleScope = draft.roleIds.length > 0 ? new Set(draft.roleIds) : null;

  const peopleMatchingSearch = useMemo(() => {
    if (!draftSearch) return people;
    return people.filter((person) => {
      const fnName = functionsById.get(person.functionId)?.nombre ?? '';
      return person.nombre.toLowerCase().includes(draftSearch) || fnName.toLowerCase().includes(draftSearch);
    });
  }, [draftSearch, people, functionsById]);

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
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(appliedFilters);

  const toggleRole = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(id) ? prev.roleIds.filter((item) => item !== id) : [...prev.roleIds, id]
    }));
  };

  const toggleFunction = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      functionIds: prev.functionIds.includes(id) ? prev.functionIds.filter((item) => item !== id) : [...prev.functionIds, id]
    }));
  };

  if (!open) return null;

  return (
    <div className="filters-drawer" role="presentation">
      <button type="button" className="filters-overlay" aria-label="Cerrar panel de filtros" onClick={onClose} />

      <aside className="filters-panel open" role="dialog" aria-modal="true" aria-label="Panel de filtros" onClick={(event) => event.stopPropagation()}>
        <div className="filters-head">
          <h3>Panel</h3>
          <button type="button" className="ghost" onClick={onClose}>Cerrar</button>
        </div>

        <div className="filters-scroll">
          <FilterSection title="Opciones de visualización">
            <div className="sub-control">
              <p>Duración de bloque</p>
              <div className="pill-grid">
                {TIME_SCALE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-pill ${scale === option ? 'active' : ''}`}
                    onClick={() => onScaleChange(option)}
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
                  className={`filter-pill ${shiftLabelMode === 'person' ? 'active' : ''}`}
                  onClick={() => onShiftLabelModeChange('person')}
                >
                  <span>Nombre</span>
                </button>
                <button
                  type="button"
                  className={`filter-pill ${shiftLabelMode === 'function' ? 'active' : ''}`}
                  onClick={() => onShiftLabelModeChange('function')}
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
                    active={draft.roleIds.includes(role.id)}
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
                            active={draft.functionIds.includes(fn.id)}
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
        </div>

        <FilterFooter
          searchText={draft.searchText}
          onSearchChange={(value) => setDraft((prev) => ({ ...prev, searchText: value }))}
          onSearchClear={() => setDraft((prev) => ({ ...prev, searchText: '' }))}
          disabledApply={!hasUnsavedChanges}
          onApply={() => {
            onApplyFilters(draft);
            onClose();
          }}
          onReset={() => {
            setDraft(EMPTY_FILTERS);
            onResetFilters();
            onClose();
          }}
        />
      </aside>
    </div>
  );
};
