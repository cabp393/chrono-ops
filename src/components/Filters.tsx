import type { Person, Role } from '../types';

type Props = {
  roles: Role[];
  people: Person[];
  selectedRoles: string[];
  personQuery: string;
  onlyGaps: boolean;
  onToggleRole: (id: string) => void;
  onPersonQuery: (q: string) => void;
  onToggleGaps: (value: boolean) => void;
};

export const Filters = ({ roles, people, selectedRoles, personQuery, onlyGaps, onToggleRole, onPersonQuery, onToggleGaps }: Props) => (
  <aside className="card filters-card">
    <h3>Filtros</h3>
    <label>
      Buscar persona
      <input value={personQuery} onChange={(e) => onPersonQuery(e.target.value)} placeholder="Nombre..." />
    </label>
    <div>
      <p>Rol</p>
      <div className="role-options">
        {roles.map((role) => (
          <label key={role.id}>
            <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => onToggleRole(role.id)} />
            {role.nombre}
          </label>
        ))}
      </div>
    </div>
    <label className="toggle">
      <input type="checkbox" checked={onlyGaps} onChange={(e) => onToggleGaps(e.target.checked)} />
      Mostrar solo vacíos
    </label>
    <div className="mini-stats">
      {roles.map((r) => (
        <span key={r.id} className="badge" style={{ borderColor: r.color }}>{r.nombre}: {people.filter((p) => p.rolId === r.id).length}</span>
      ))}
    </div>
  </aside>
);
