import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, Role, ScheduleOverride, ScheduleTemplate } from '../../types';
import { DAY_KEYS, getDayKey, isValidSlot, toISODate } from '../../lib/scheduleUtils';
import { PeopleList } from './PeopleList';
import { PersonScheduleEditor } from './PersonScheduleEditor';
import { WorkerModal } from './WorkerModal';

type Props = {
  people: Person[];
  roles: Role[];
  functions: Function[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
  weekStart: Date;
  onChange: (next: { templates: ScheduleTemplate[]; personWeekPlans: PersonWeekPlan[]; personFunctionWeeks: PersonFunctionWeek[]; overrides: ScheduleOverride[] }) => void;
  onCreatePerson: (payload: { nombre: string; roleId: string }) => void;
  onUpdatePerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, roles, functions, templates, personWeekPlans, personFunctionWeeks, overrides, weekStart, onChange, onCreatePerson, onUpdatePerson, onDeletePerson }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [personDraft, setPersonDraft] = useState<{ nombre: string; roleId: string } | null>(null);

  const [draftWeekPlans, setDraftWeekPlans] = useState<PersonWeekPlan[]>(personWeekPlans);
  const [draftFunctionWeeks, setDraftFunctionWeeks] = useState<PersonFunctionWeek[]>(personFunctionWeeks);
  const [draftOverrides, setDraftOverrides] = useState<ScheduleOverride[]>(overrides);

  useEffect(() => {
    setDraftWeekPlans(personWeekPlans);
    setDraftFunctionWeeks(personFunctionWeeks);
    setDraftOverrides(overrides);
  }, [personWeekPlans, personFunctionWeeks, overrides]);

  useEffect(() => {
    if (!selectedPersonId) {
      setPersonDraft(null);
      return;
    }
    const selected = people.find((item) => item.id === selectedPersonId);
    setPersonDraft(selected ? { nombre: selected.nombre, roleId: selected.roleId } : null);
  }, [selectedPersonId, people]);

  const selectedPerson = people.find((item) => item.id === selectedPersonId);
  const personDraftChanged = !!selectedPerson && !!personDraft && (selectedPerson.nombre !== personDraft.nombre.trim() || selectedPerson.roleId !== personDraft.roleId);
  const hasUnsavedChanges = !same(personWeekPlans, draftWeekPlans) || !same(personFunctionWeeks, draftFunctionWeeks) || !same(overrides, draftOverrides) || personDraftChanged;
  const hasInvalidOverrides = draftOverrides.some((item) => !isValidSlot({ start: item.start, end: item.end }));
  const hasInvalidTemplates = templates.some((template) => DAY_KEYS.some((dayKey) => !isValidSlot(template.days[dayKey])));
  const hasInvalidSlots = hasInvalidOverrides || hasInvalidTemplates;

  const weekStartISO = toISODate(weekStart);
  const selectedWeekPlan = useMemo(
    () => draftWeekPlans.find((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO),
    [draftWeekPlans, selectedPersonId, weekStartISO]
  );
  const selectedFunctionWeek = useMemo(
    () => draftFunctionWeeks.find((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO),
    [draftFunctionWeeks, selectedPersonId, weekStartISO]
  );

  const selectPerson = (personId: string) => {
    if (selectedPersonId !== personId && hasUnsavedChanges) {
      setDraftWeekPlans(personWeekPlans);
      setDraftFunctionWeeks(personFunctionWeeks);
      setDraftOverrides(overrides);
      const current = people.find((item) => item.id === personId);
      setPersonDraft(current ? { nombre: current.nombre, roleId: current.roleId } : null);
    }
    setSelectedPersonId(personId);
  };

  const upsertWeekPlan = (next: { templateId?: string | null; functionId?: string | null }) => {
    if (!selectedPersonId) return;
    if (next.templateId !== undefined) {
      setDraftWeekPlans((prev) => {
        const current = prev.find((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO);
        if (!current) return [...prev, { personId: selectedPersonId, weekStartISO, templateId: next.templateId ?? null }];
        return prev.map((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO ? { ...item, templateId: next.templateId ?? null } : item);
      });
    }
    if (next.functionId !== undefined) {
      setDraftFunctionWeeks((prev) => {
        const current = prev.find((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO);
        if (!current) return [...prev, { personId: selectedPersonId, weekStartISO, functionId: next.functionId ?? null }];
        return prev.map((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO ? { ...item, functionId: next.functionId ?? null } : item);
      });
    }
  };

  const upsertOverride = (dateISO: string, start: string | null, end: string | null) => {
    if (!selectedPersonId || !selectedWeekPlan) return;
    const selectedTemplate = templates.find((item) => item.id === selectedWeekPlan.templateId);
    const dayDate = new Date(`${dateISO}T00:00:00`);
    const dayKey = getDayKey(dayDate);
    const templateSlot = selectedTemplate?.days[dayKey] ?? { start: null, end: null };

    setDraftOverrides((prev) => {
      const existing = prev.find((item) => item.personId === selectedPersonId && item.dateISO === dateISO);
      const matchesTemplate = start === templateSlot.start && end === templateSlot.end;
      if (matchesTemplate) {
        return prev.filter((item) => !(item.personId === selectedPersonId && item.dateISO === dateISO));
      }
      if (existing) return prev.map((item) => item.id === existing.id ? { ...item, start, end } : item);
      return [...prev, { id: crypto.randomUUID(), personId: selectedPersonId, dateISO, start, end }];
    });
  };

  const clearOverride = (dateISO: string) => {
    if (!selectedPersonId) return;
    setDraftOverrides((prev) => prev.filter((item) => !(item.personId === selectedPersonId && item.dateISO === dateISO)));
  };

  const resetDraft = () => {
    setDraftWeekPlans(personWeekPlans);
    setDraftFunctionWeeks(personFunctionWeeks);
    setDraftOverrides(overrides);
    setPersonDraft(selectedPerson ? { nombre: selectedPerson.nombre, roleId: selectedPerson.roleId } : null);
  };

  const cancelEditing = () => {
    resetDraft();
    setSelectedPersonId(null);
  };

  return (
    <main className={`dashboard-layout schedules-layout ${selectedPersonId ? 'has-selection' : ''}`}>
      <PeopleList
        people={people}
        roles={roles}
        functions={functions}
        templates={templates}
        personWeekPlans={draftWeekPlans}
        overrides={draftOverrides}
        weekStart={weekStart}
        selectedPersonId={selectedPersonId}
        collapsedToSelected={!!selectedPersonId}
        search={search}
        onSearch={setSearch}
        onSelect={selectPerson}
      />

      <PersonScheduleEditor
        person={selectedPerson}
        roles={roles}
        functions={functions}
        templates={templates}
        weekPlan={selectedWeekPlan}
        functionWeek={selectedFunctionWeek}
        overrides={draftOverrides}
        weekStart={weekStart}
        hasUnsavedChanges={hasUnsavedChanges}
        hasInvalidSlots={hasInvalidSlots}
        onTemplateChange={(templateId) => upsertWeekPlan({ templateId })}
        onFunctionChange={(functionId) => upsertWeekPlan({ functionId })}
        onUpsertOverride={upsertOverride}
        onClearOverride={clearOverride}
        onPersonDraftChange={setPersonDraft}
        onDeletePerson={(personId) => {
          onDeletePerson(personId);
          setSelectedPersonId(null);
          setPersonDraft(null);
        }}
        onReset={cancelEditing}
        onSave={() => {
          if (hasInvalidSlots) return;
          if (selectedPerson && personDraft && personDraft.nombre.trim() && personDraft.roleId && personDraftChanged) {
            onUpdatePerson({ ...selectedPerson, nombre: personDraft.nombre.trim(), roleId: personDraft.roleId });
          }
          onChange({ templates, personWeekPlans: draftWeekPlans, personFunctionWeeks: draftFunctionWeeks, overrides: draftOverrides });
          setSelectedPersonId(null);
          setPersonDraft(null);
        }}
      />

      {!selectedPersonId ? <footer className="schedule-footer schedule-footer-create">
        <button className="primary" onClick={() => setWorkerModalOpen(true)}><Plus size={14} />Añadir trabajador</button>
      </footer> : null}

      <WorkerModal
        open={workerModalOpen}
        roles={roles}
        onClose={() => setWorkerModalOpen(false)}
        onSave={(payload) => {
          onCreatePerson(payload);
          setWorkerModalOpen(false);
        }}
      />
    </main>
  );
};
