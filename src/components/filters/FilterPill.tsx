type Props = {
  label: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  color?: string;
  onClick: () => void;
};

export const FilterPill = ({ label, count, active, disabled = false, color = '#94a3b8', onClick }: Props) => (
  <button
    type="button"
    className={`filter-pill ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    style={{ ['--pill-color' as string]: color }}
  >
    <span className="pill-dot" style={{ backgroundColor: color }} />
    <span>{label}{typeof count === 'number' ? ` (${count})` : ''}</span>
  </button>
);
