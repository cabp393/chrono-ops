type Props = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  ariaLabel?: string;
};

export const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar por nombre o función…',
  ariaLabel = 'Buscar por nombre o función'
}: Props) => (
  <div className="search-input-wrap">
    <span className="search-icon" aria-hidden="true">⌕</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
    {value && (
      <button type="button" className="clear-search" onClick={onClear} aria-label="Limpiar búsqueda">
        ×
      </button>
    )}
  </div>
);
