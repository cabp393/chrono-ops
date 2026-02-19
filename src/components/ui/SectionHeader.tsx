import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/lucide';

type Props = {
  title: string;
  open?: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
};

export const SectionHeader = ({ title, open = true, onToggle, actions }: Props) => (
  <div className="section-header">
    <button className="section-toggle" onClick={onToggle} disabled={!onToggle}>
      <strong>{title}</strong>
      {onToggle ? (open ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
    </button>
    {actions}
  </div>
);
