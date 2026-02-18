type Props = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export const SearchInput = ({ value, onChange, onClear }: Props) => (
  <div className="search-input-wrap">
    <span className="search-icon" aria-hidden="true">⌕</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar por nombre o función…"
      aria-label="Buscar por nombre o función"
    />
    {value && (
      <button type="button" className="clear-search" onClick={onClear} aria-label="Limpiar búsqueda">
        ×
      </button>
    )}
  </div>
);
