import { Trash2 } from '../../lib/lucide';
import { AppModal } from './AppModal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
};

export const ConfirmDialog = ({ open, onOpenChange, title, description, onConfirm, confirmLabel = 'Eliminar' }: Props) => (
  <AppModal
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    icon={<Trash2 size={16} />}
    footer={(
      <>
        <button className="ghost" onClick={() => onOpenChange(false)}>Cancelar</button>
        <button className="danger" onClick={() => { onConfirm(); onOpenChange(false); }}><Trash2 size={16} />{confirmLabel}</button>
      </>
    )}
  >
    <p>{description}</p>
    <p className="error">Esta acción no se puede deshacer.</p>
  </AppModal>
);
