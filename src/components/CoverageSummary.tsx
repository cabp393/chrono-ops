import type { CoverageBlock, Person, Role } from '../types';

type Props = {
  roles: Role[];
  people: Person[];
  weekBlocks: CoverageBlock[];
  roleTotals: Record<string, number>;
};

export const CoverageSummary = ({ roles, people, weekBlocks, roleTotals }: Props) => {
  const max = Math.max(...weekBlocks.map((b) => b.total), 1);
  return (
    <section className="card summary-card">
      <div>
        <h3>Resumen de cobertura</h3>
        <p>{people.length} personas activas</p>
      </div>
      <div className="badges">
        {roles.map((role) => (
          <span key={role.id} className="badge" style={{ borderColor: role.color }}>
            {role.nombre}: {roleTotals[role.id] || 0}
          </span>
        ))}
      </div>
      <div className="heatbar">
        {weekBlocks.map((block, i) => (
          <div
            key={i}
            className="heatbar-segment"
            style={{ opacity: 0.2 + 0.8 * (block.total / max) }}
            title={Object.entries(block.byRole).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Sin cobertura'}
          />
        ))}
      </div>
    </section>
  );
};
