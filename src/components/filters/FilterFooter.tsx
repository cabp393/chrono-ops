import { Check, RotateCcw } from '../../lib/lucide';
import type { ReactNode } from 'react';
import { SearchInput } from './SearchInput';

type Props = {
  searchText: string;
  searchPicker?: ReactNode;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onReset: () => void;
  onApply: () => void;
  disabledApply?: boolean;
};

export const FilterFooter = ({
  searchText,
  searchPicker,
  onSearchChange,
  onSearchClear,
  onReset,
  onApply,
  disabledApply = false
}: Props) => (
  <div className="filters-footer">
    {searchPicker ? <div className="search-picker-slot">{searchPicker}</div> : null}
    <SearchInput
      value={searchText}
      onChange={onSearchChange}
      onClear={onSearchClear}
      placeholder="Buscar trabajador…"
      ariaLabel="Buscar trabajador"
    />
    <div className="filters-footer-actions">
      <button type="button" className="footer-reset" onClick={onReset}><RotateCcw size={16} />Reiniciar</button>
      <button type="button" className="primary footer-apply" disabled={disabledApply} onClick={onApply}><Check size={16} />Aplicar filtros</button>
    </div>
  </div>
);
