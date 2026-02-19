import { useEffect, useMemo, useState } from 'react';
import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, ScheduleOverride, ScheduleTemplate } from '../../types';
import { DAY_KEYS, isValidSlot, toISODate } from '../../lib/scheduleUtils';
import { PeopleList } from './PeopleList';
import { PersonScheduleEditor } from './PersonScheduleEditor';
import { TemplateModal } from './TemplateModal';

type Props = {
  people: Person[];
  functions: Function[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
  weekStart: Date;
  onChange: (next: { templates: ScheduleTemplate[]; personWeekPlans: PersonWeekPlan[]; personFunctionWeeks: PersonFunctionWeek[]; overrides: ScheduleOverride[] }) => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, functions, templates, personWeekPlans, personFunctionWeeks, overrides, weekStart, onChange }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [draftWeekPlans, setDraftWeekPlans] = useState<PersonWeekPlan[]>(personWeekPlans);
  const [draftFunctionWeeks, setDraftFunctionWeeks] = useState<PersonFunctionWeek[]>(personFunctionWeeks);
  const [draftOverrides, setDraftOverrides] = useState<ScheduleOverride[]>(overrides);

  useEffect(() => {
    setDraftWeekPlans(personWeekPlans);
    setDraftFunctionWeeks(personFunctionWeeks);
    setDraftOverrides(overrides);
  }, [personWeekPlans, personFunctionWeeks, overrides]);

  const hasUnsavedChanges = !same(personWeekPlans, draftWeekPlans) || !same(personFunctionWeeks, draftFunctionWeeks) || !same(overrides, draftOverrides);
  const hasInvalidOverrides = draftOverrides.some((item) => !isValidSlot({ start: item.start, end: item.end }));
  const hasInvalidTemplates = templates.some((template) => DAY_KEYS.some((dayKey) => !isValidSlot(template.days[dayKey])));
  const hasInvalidSlots = hasInvalidOverrides || hasInvalidTemplates;

  const weekStartISO = toISODate(weekStart);
  const selectedPerson = people.find((item) => item.id === selectedPersonId);
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
    setDraftOverrides((prev) => {
      const existing = prev.find((item) => item.personId === selectedPersonId && item.dateISO === dateISO);
      if (existing) return prev.map((item) => item.id === existing.id ? { ...item, start, end } : item);
      return [...prev, { id: crypto.randomUUID(), personId: selectedPersonId, dateISO, start, end }];
    });
  };

  const resetDraft = () => {
    setDraftWeekPlans(personWeekPlans);
    setDraftFunctionWeeks(personFunctionWeeks);
    setDraftOverrides(overrides);
  };

  return (
    <main className="dashboard-layout schedules-layout">
      <PeopleList
        people={people}
        functions={functions}
        templates={templates}
        personWeekPlans={draftWeekPlans}
        personFunctionWeeks={draftFunctionWeeks}
        overrides={draftOverrides}
        weekStart={weekStart}
        selectedPersonId={selectedPersonId}
        search={search}
        onSearch={setSearch}
        onSelect={selectPerson}
      />

      <PersonScheduleEditor
        person={selectedPerson}
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
        onOpenTemplateModal={() => setTemplateModalOpen(true)}
        onUpsertOverride={upsertOverride}
        onReset={resetDraft}
        onSave={() => !hasInvalidSlots && onChange({ templates, personWeekPlans: draftWeekPlans, personFunctionWeeks: draftFunctionWeeks, overrides: draftOverrides })}
      />

      <TemplateModal
        open={templateModalOpen}
        templates={templates}
        onClose={() => setTemplateModalOpen(false)}
        onSave={(nextTemplates) => {
          const sanitize = (rows: PersonWeekPlan[]) => rows.map((item) => nextTemplates.some((tpl) => tpl.id === item.templateId) ? item : { ...item, templateId: null });
          onChange({ templates: nextTemplates, personWeekPlans: sanitize(personWeekPlans), personFunctionWeeks, overrides });
          setDraftWeekPlans(sanitize(draftWeekPlans));
        }}
      />
    </main>
  );
};
