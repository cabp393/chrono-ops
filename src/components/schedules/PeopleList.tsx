import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, ScheduleOverride, ScheduleTemplate } from '../../types';
import { toISODate, weekDates } from '../../lib/scheduleUtils';

type Props = {
  people: Person[];
  functions: Function[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
  weekStart: Date;
  selectedPersonId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (personId: string) => void;
};

export const PeopleList = ({
  people,
  functions,
  templates,
  personWeekPlans,
  personFunctionWeeks,
  overrides,
  weekStart,
  selectedPersonId,
  search,
  onSearch,
  onSelect
}: Props) => {
  const weekStartISO = toISODate(weekStart);
  const functionById = new Map(functions.map((fn) => [fn.id, fn]));
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const weekPlanByPerson = new Map(personWeekPlans.filter((item) => item.weekStartISO === weekStartISO).map((item) => [item.personId, item]));
  const weekFunctionByPerson = new Map(personFunctionWeeks.filter((item) => item.weekStartISO === weekStartISO).map((item) => [item.personId, item.functionId]));
  const weekDays = new Set(weekDates(weekStart).map((date) => toISODate(date)));

  const filtered = people.filter((person) => {
    const fnId = weekFunctionByPerson.get(person.id);
    const fnName = fnId ? functionById.get(fnId)?.nombre ?? '' : '';
    const term = search.trim().toLowerCase();
    return !term || person.nombre.toLowerCase().includes(term) || fnName.toLowerCase().includes(term);
  });

  return (
    <aside className="card schedules-people-list">
      <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar persona o función" />
      <div className="people-items">
        {filtered.map((person) => {
          const selected = selectedPersonId === person.id;
          const plan = weekPlanByPerson.get(person.id);
          const template = plan?.templateId ? templateById.get(plan.templateId) : null;
          const weekFunctionId = weekFunctionByPerson.get(person.id);
          const weekFunction = weekFunctionId ? functionById.get(weekFunctionId) : null;
          const hasOverrides = !!plan && overrides.some((item) => item.personId === person.id && weekDays.has(item.dateISO));
          return (
            <button key={person.id} className={`person-item ${selected ? 'active' : ''}`} onClick={() => onSelect(person.id)}>
              <div>
                <strong>{person.nombre}</strong>
                <p>{weekFunction?.nombre ?? 'Semana sin función'}</p>
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
