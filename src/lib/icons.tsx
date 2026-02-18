import type { SVGProps } from 'react';

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>
);

export const Calendar = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>;
export const ChevronLeft = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="15 18 9 12 15 6" /></Icon>;
export const ChevronRight = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="9 18 15 12 9 6" /></Icon>;
export const Plus = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
export const ZoomIn = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></Icon>;
export const ZoomOut = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></Icon>;
export const Target = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /></Icon>;
