type Props = {
  onReset: () => void;
  onApply: () => void;
  disabledApply?: boolean;
};

export const FilterFooter = ({ onReset, onApply, disabledApply = false }: Props) => (
  <div className="filters-footer">
    <button type="button" className="footer-reset" onClick={onReset}>Reiniciar</button>
    <button type="button" className="primary footer-apply" disabled={disabledApply} onClick={onApply}>Aplicar filtros</button>
  </div>
);
