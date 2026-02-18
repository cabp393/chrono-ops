import { useEffect, useMemo, useState } from 'react';
import type { AppliedFilters, Function, Person, Role } from '../types';

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
  const outOfRoleSelections = draft.functionIds.filter((functionId) => {
    const fn = functionsById.get(functionId);
    return !!(fn && roleScope && !roleScope.has(fn.roleId));
  });

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

  return (
    <aside className={`filters-panel ${open ? 'open' : ''}`}>
      <div className="filters-head compact">
        <h3>Filtros</h3>
        <div className="filters-head-actions">
          {hasUnsavedChanges && <span className="pending-badge">Cambios sin aplicar</span>}
          <button className="ghost mobile-only" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      <div className="filters-scroll">
        <section className="filters-section">
          <input
            value={draft.searchText}
            onChange={(e) => setDraft((prev) => ({ ...prev, searchText: e.target.value }))}
            placeholder="Buscar por nombre o función…"
          />
          {draft.searchText && <button className="clear-search" onClick={() => setDraft((prev) => ({ ...prev, searchText: '' }))}>×</button>}
        </section>

        <section className="filters-section">
          <h4>Rol</h4>
          <div className="role-list compact">
            {roles.map((role) => (
              <label key={role.id}>
                <span><i style={{ backgroundColor: role.color }} />{role.nombre} ({roleCounts[role.id] || 0})</span>
                <input type="checkbox" checked={draft.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
              </label>
            ))}
          </div>
        </section>

        <section className="filters-section">
          <h4>Función</h4>
          {visibleRoleIds.map((roleId) => {
            const role = roles.find((item) => item.id === roleId);
            const items = groupedFunctions[roleId] || [];
            if (items.length === 0) return null;
            return (
              <div key={roleId} className="function-group">
                <p>{role?.nombre ?? roleId}</p>
                {items.map((fn) => (
                  <label key={fn.id} className="function-item">
                    <span>{fn.nombre} ({functionCounts[fn.id] || 0})</span>
                    <input type="checkbox" checked={draft.functionIds.includes(fn.id)} onChange={() => toggleFunction(fn.id)} />
                  </label>
                ))}
              </div>
            );
          })}

          {outOfRoleSelections.length > 0 && (
            <div className="function-group outside-filter">
              <p>Fuera de filtro</p>
              {outOfRoleSelections.map((functionId) => {
                const fn = functionsById.get(functionId);
                if (!fn) return null;
                return (
                  <label key={functionId} className="function-item disabled">
                    <span>{fn.nombre}</span>
                    <input type="checkbox" checked onChange={() => toggleFunction(functionId)} />
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className="filters-section tight">
          <label className="switch-row">
            Mostrar solo vacíos
            <input type="checkbox" checked={onlyGaps} onChange={(e) => onToggleGaps(e.target.checked)} />
          </label>
        </section>

        <section className="filters-section tight">
          <label className="switch-row">
            Mostrar etiquetas
            <input type="checkbox" checked={showLabels} onChange={(e) => onToggleLabels(e.target.checked)} />
          </label>
        </section>
      </div>

      <div className="filters-footer">
        <button className="primary" onClick={() => onApplyFilters(draft)}>Aplicar</button>
        <button onClick={() => { setDraft({ searchText: '', roleIds: [], functionIds: [] }); onResetFilters(); }}>Reiniciar</button>
      </div>
    </aside>
  );
};
