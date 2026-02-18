import type { CSSProperties } from 'react';
import type { Role, ScheduleBlock } from '../types';

type Props = {
  block: ScheduleBlock;
  role?: Role;
  compact: boolean;
  style: CSSProperties;
};

export const ShiftItem = ({ block, role, compact, style }: Props) => (
  <div
    className={`shift-item ${compact ? 'compact' : ''}`}
    style={{ ...style, '--shift-color': role?.color || '#93c5fd', cursor: 'default' } as CSSProperties}
    title={block.labelText}
  >
    <strong>{block.labelText}</strong>
  </div>
);
