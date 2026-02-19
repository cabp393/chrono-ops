import { ChevronLeft, ChevronRight, Search, Target } from '../lib/lucide';
import { IconButton } from './ui/IconButton';

type ViewMode = 'week' | 'schedules' | 'personal';

type Props = {
  weekLabel: string;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onOpenFilters: () => void;
  view: ViewMode;
  onChangeView: (view: ViewMode) => void;
};

export const HeaderBar = ({
  weekLabel,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onOpenFilters,
  view,
  onChangeView
}: Props) => (
  <header className="header-bar">
    <div className="header-top-row">
      <div className="brand-wrap">
        <div className="brand">ShiftBoard</div>
        <div className="segmented nav-tabs">
          <button className={view === 'week' ? 'active' : ''} onClick={() => onChangeView('week')}>Semana</button>
          <button className={view === 'schedules' ? 'active' : ''} onClick={() => onChangeView('schedules')}>Horarios</button>
          <button className={view === 'personal' ? 'active' : ''} onClick={() => onChangeView('personal')}>Personal</button>
        </div>
      </div>
      <div className="header-actions">
        {view === 'week' ? <button className="ghost" onClick={onOpenFilters}><Search size={16} />Filtros</button> : null}
      </div>
    </div>

    {view === 'week' ? (
      <div className="week-controls">
        <IconButton className={`current-week-icon ${isCurrentWeek ? 'active' : ''}`} onClick={onCurrentWeek} label="Ir a semana actual"><Target size={16} /></IconButton>
        <IconButton onClick={onPrevWeek} label="Semana anterior"><ChevronLeft size={16} /></IconButton>
        <span className="week-label">{weekLabel}</span>
        <IconButton onClick={onNextWeek} label="Semana siguiente"><ChevronRight size={16} /></IconButton>
      </div>
    ) : null}
  </header>
);
