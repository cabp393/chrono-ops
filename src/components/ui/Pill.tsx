import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  muted?: boolean;
};

export const Pill = ({ children, muted = false }: Props) => <span className={`chip ${muted ? 'muted' : ''}`}>{children}</span>;
