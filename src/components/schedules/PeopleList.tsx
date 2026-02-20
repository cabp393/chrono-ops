import type { Person, PersonWeekPlan, Role, ScheduleOverride, ScheduleTemplate } from '../../types';
import { toISODate, weekDates } from '../../lib/scheduleUtils';

type Props = {
  people: Person[];
  roles: Role[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  overrides: ScheduleOverride[];
  weekStart: Date;
  selectedPersonId: string | null;
  collapsedToSelected: boolean;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (personId: string) => void;
};

export const PeopleList = ({
  people,
  roles,
  templates,
  personWeekPlans,
  overrides,
  weekStart,
  selectedPersonId,
  collapsedToSelected,
  search,
  onSearch,
  onSelect
}: Props) => {
  const weekStartISO = toISODate(weekStart);
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const weekPlanByPerson = new Map(personWeekPlans.filter((item) => item.weekStartISO === weekStartISO).map((item) => [item.personId, item]));
  const weekDays = new Set(weekDates(weekStart).map((date) => toISODate(date)));

  const filtered = people.filter((person) => {
    const roleName = roleById.get(person.roleId)?.nombre ?? '';
    const term = search.trim().toLowerCase();
    return !term || person.nombre.toLowerCase().includes(term) || roleName.toLowerCase().includes(term);
  });
  const visiblePeople = collapsedToSelected && selectedPersonId
    ? filtered.filter((person) => person.id === selectedPersonId)
    : filtered;

  return (
    <aside className="card schedules-people-list">
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Buscar persona o rol"
        disabled={collapsedToSelected}
      />
      <div className="people-items">
        {visiblePeople.map((person) => {
          const selected = selectedPersonId === person.id;
          const plan = weekPlanByPerson.get(person.id);
          const template = plan?.templateId ? templateById.get(plan.templateId) : null;
          const roleName = roleById.get(person.roleId)?.nombre ?? 'Sin rol';
          const hasOverrides = !!plan && overrides.some((item) => item.personId === person.id && weekDays.has(item.dateISO));
          return (
            <button key={person.id} className={`person-item ${selected ? 'active' : ''}`} onClick={() => onSelect(person.id)}>
              <div>
                <strong>{person.nombre}</strong>
                <p>{roleName}</p>
              </div>
              <div className="person-item-meta">
                {template ? <span className="chip">{template.name}</span> : <span className="chip muted">Semana en blanco</span>}
                {hasOverrides ? <span className="chip warning">Ajustes</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
