import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

export const FilterSection = ({ title, children }: Props) => (
  <section className="filter-section">
    <h4>{title}</h4>
    {children}
  </section>
);
