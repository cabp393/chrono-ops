import { SearchInput } from './SearchInput';

type Props = {
  searchText: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onReset: () => void;
  onApply: () => void;
  disabledApply?: boolean;
};

export const FilterFooter = ({
  searchText,
  onSearchChange,
  onSearchClear,
  onReset,
  onApply,
  disabledApply = false
}: Props) => (
  <div className="filters-footer">
    <SearchInput
      value={searchText}
      onChange={onSearchChange}
      onClear={onSearchClear}
      placeholder="Buscar trabajador…"
      ariaLabel="Buscar trabajador"
    />
    <div className="filters-footer-actions">
      <button type="button" className="footer-reset" onClick={onReset}>Reiniciar</button>
      <button type="button" className="primary footer-apply" disabled={disabledApply} onClick={onApply}>Aplicar filtros</button>
    </div>
  </div>
);
