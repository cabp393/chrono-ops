import type { SVGProps } from 'react';

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>
);

export const X = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>;
export const Plus = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
export const Pencil = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>;
export const Trash2 = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></Icon>;
export const Copy = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icon>;
export const Save = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></Icon>;
export const Search = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
export const RotateCcw = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="1 4 1 10 7 10" /><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" /></Icon>;
export const Check = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="20 6 9 17 4 12" /></Icon>;
export const ChevronDown = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="6 9 12 15 18 9" /></Icon>;
export const ChevronUp = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="18 15 12 9 6 15" /></Icon>;
export const ArrowLeft = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Icon>;
export const Palette = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 22a10 10 0 1 1 10-10c0 1.1-.9 2-2 2h-2a2 2 0 0 0-2 2 2 2 0 0 0 2 2c1.1 0 2 .9 2 2A10 10 0 0 1 12 22Z" /></Icon>;
export const ChevronLeft = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="15 18 9 12 15 6" /></Icon>;
export const ChevronRight = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><polyline points="9 18 15 12 9 6" /></Icon>;
export const Target = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /></Icon>;
