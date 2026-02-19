import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export const IconButton = ({ label, children, className = '', ...rest }: Props) => (
  <button {...rest} className={`icon-btn ${className}`.trim()} aria-label={label} title={label}>{children}</button>
);
