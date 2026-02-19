import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from '../../lib/lucide';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export const AppModal = ({ open, onOpenChange, title, icon, children, footer, className = '' }: Props) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => onOpenChange(false)} role="dialog" aria-modal="true">
      <section className={`modal ${className}`} onClick={(event) => event.stopPropagation()}>
        <header className="app-modal-header">
          <h3>{icon}<span>{title}</span></h3>
          <button ref={closeRef} className="icon-btn" aria-label="Cerrar" onClick={() => onOpenChange(false)}><X size={16} /></button>
        </header>
        <div className="app-modal-body">{children}</div>
        {footer ? <footer className="app-modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
};
