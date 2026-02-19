import type { Function, Person, PersonSchedule, ScheduleOverride, ScheduleTemplate } from '../../types';

type Props = {
  people: Person[];
  functions: Function[];
  templates: ScheduleTemplate[];
  personSchedules: PersonSchedule[];
  overrides: ScheduleOverride[];
  weekStart: Date;
  selectedPersonId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (personId: string) => void;
};

export const PeopleList = ({ people, templates, personSchedules, selectedPersonId, search, onSearch, onSelect }: Props) => {
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const assignedByPerson = new Map(personSchedules.map((item) => [item.personId, item.templateId]));
  const filtered = people.filter((person) => !search.trim() || person.nombre.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <aside className="card schedules-people-list">
      <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar persona" />
      <div className="people-items">
        {filtered.map((person) => {
          const selected = selectedPersonId === person.id;
          const templateId = assignedByPerson.get(person.id) ?? null;
          const template = templateId ? templateById.get(templateId) : null;
          return (
            <button key={person.id} className={`person-item ${selected ? 'active' : ''}`} onClick={() => onSelect(person.id)}>
              <div><strong>{person.nombre}</strong><p>{person.roleId}</p></div>
              <div className="person-item-meta">
                {template ? <span className="chip">{template.name}</span> : <span className="chip muted">Sin plantilla</span>}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
