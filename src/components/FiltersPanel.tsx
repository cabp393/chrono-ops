import type { Person, Role } from '../types';

type Metric = {
  label: string;
  value: string;
};

type Props = {
  roles: Role[];
  people: Person[];
  selectedRoles: string[];
  personQuery: string;
  onlyGaps: boolean;
  showLabels: boolean;
  metrics: Metric[];
  open: boolean;
  onClose: () => void;
  onToggleRole: (id: string) => void;
  onPersonQuery: (q: string) => void;
  onToggleGaps: (value: boolean) => void;
  onToggleLabels: (value: boolean) => void;
};

export const FiltersPanel = ({
  roles,
  people,
  selectedRoles,
  personQuery,
  onlyGaps,
  showLabels,
  metrics,
  open,
  onClose,
  onToggleRole,
  onPersonQuery,
  onToggleGaps,
  onToggleLabels
}: Props) => (
  <aside className={`filters-panel ${open ? 'open' : ''}`}>
    <div className="filters-head">
      <h3>Filtros</h3>
      <button className="ghost mobile-only" onClick={onClose}>Cerrar</button>
    </div>

    <label>
      Buscar persona
      <input value={personQuery} onChange={(e) => onPersonQuery(e.target.value)} placeholder="Nombre..." />
    </label>

    <div>
      <p>Roles</p>
      <div className="role-list">
        {roles.map((role) => {
          const total = people.filter((person) => person.rolId === role.id).length;
          return (
            <label key={role.id}>
              <span><i style={{ backgroundColor: role.color }} />{role.nombre} ({total})</span>
              <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => onToggleRole(role.id)} />
            </label>
          );
        })}
      </div>
    </div>

    <label className="switch-row">
      Mostrar solo vacíos
      <input type="checkbox" checked={onlyGaps} onChange={(e) => onToggleGaps(e.target.checked)} />
    </label>
    <label className="switch-row">
      Mostrar etiquetas
      <input type="checkbox" checked={showLabels} onChange={(e) => onToggleLabels(e.target.checked)} />
    </label>

    <div>
      <p>Leyenda</p>
      <div className="chip-row">
        {roles.map((role) => (
          <span key={role.id} className="chip" style={{ borderColor: role.color, color: role.color }}>{role.nombre}</span>
        ))}
      </div>
    </div>

    <div>
      <p>Métricas rápidas</p>
      <div className="metrics-list">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </div>
  </aside>
);
