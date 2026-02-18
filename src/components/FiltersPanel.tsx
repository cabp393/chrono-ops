import { useEffect, useMemo, useState } from 'react';
import type { AppliedFilters, Function, Person, Role } from '../types';
import { FilterFooter } from './filters/FilterFooter';
import { FilterPill } from './filters/FilterPill';
import { FilterSection } from './filters/FilterSection';
import { SearchInput } from './filters/SearchInput';

type Props = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  appliedFilters: AppliedFilters;
  showLabels: boolean;
  onlyGaps: boolean;
  open: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  onResetFilters: () => void;
  onToggleLabels: (value: boolean) => void;
  onToggleGaps: (value: boolean) => void;
};

const norm = (value: string) => value.trim().toLowerCase();

export const FiltersPanel = ({
  roles,
  functions,
  people,
  appliedFilters,
  showLabels,
  onlyGaps,
  open,
  onClose,
  onApplyFilters,
  onResetFilters,
  onToggleLabels,
  onToggleGaps
}: Props) => {
  const [draft, setDraft] = useState<AppliedFilters>(appliedFilters);

  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

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

  const handleClose = () => {
    setDraft(appliedFilters);
    onClose();
  };

  return (
    <aside className={`filters-panel ${open ? 'open' : ''}`}>
      <div className="filters-head">
        <h3>Filtros</h3>
        <div className="filters-head-actions">
          {hasUnsavedChanges && <span className="pending-badge">Cambios sin aplicar</span>}
          <button type="button" className="ghost mobile-only" onClick={handleClose}>Cerrar</button>
        </div>
      </div>

      <div className="filters-scroll">
        <SearchInput
          value={draft.searchText}
          onChange={(value) => setDraft((prev) => ({ ...prev, searchText: value }))}
          onClear={() => setDraft((prev) => ({ ...prev, searchText: '' }))}
        />

        <FilterSection title="Rol">
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
        </FilterSection>

        <FilterSection title="Función">
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
        </FilterSection>

        <FilterSection title="Opciones">
          <label className="switch-row">
            <span>Mostrar solo vacíos</span>
            <button
              type="button"
              className={`switch ${onlyGaps ? 'on' : ''}`}
              aria-pressed={onlyGaps}
              onClick={() => onToggleGaps(!onlyGaps)}
            >
              <span className="switch-thumb" />
            </button>
          </label>

          <label className="switch-row">
            <span>Mostrar etiquetas</span>
            <button
              type="button"
              className={`switch ${showLabels ? 'on' : ''}`}
              aria-pressed={showLabels}
              onClick={() => onToggleLabels(!showLabels)}
            >
              <span className="switch-thumb" />
            </button>
          </label>
        </FilterSection>
      </div>

      <FilterFooter
        onApply={() => onApplyFilters(draft)}
        onReset={() => {
          setDraft({ searchText: '', roleIds: [], functionIds: [] });
          onResetFilters();
        }}
      />
    </aside>
  );
};
