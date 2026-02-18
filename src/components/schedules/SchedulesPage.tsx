import { useEffect, useMemo, useState } from 'react';
import type { Function, Person, PersonSchedule, ScheduleOverride } from '../../types';
import { addDays, startOfWeekMonday } from '../../lib/dateUtils';
import { PeopleList } from './PeopleList';
import { PersonScheduleEditor } from './PersonScheduleEditor';
import { TemplateModal } from './TemplateModal';
import { useScheduleStore } from '../../context/ScheduleStore';

const todayWeekStart = startOfWeekMonday(new Date());

type Props = {
  people: Person[];
  functions: Function[];
};

const sameAssignments = (a: PersonSchedule[], b: PersonSchedule[]) => JSON.stringify(a) === JSON.stringify(b);
const sameOverrides = (a: ScheduleOverride[], b: ScheduleOverride[]) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, functions }: Props) => {
  const { templates, personSchedules, overrides, saveAllSchedules } = useScheduleStore();
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [draftPersonSchedules, setDraftPersonSchedules] = useState<PersonSchedule[]>(personSchedules);
  const [draftOverrides, setDraftOverrides] = useState<ScheduleOverride[]>(overrides);

  useEffect(() => {
    setDraftPersonSchedules(personSchedules);
    setDraftOverrides(overrides);
  }, [personSchedules, overrides]);

  useEffect(() => {
    if (selectedPersonId && people.some((person) => person.id === selectedPersonId)) return;
    setSelectedPersonId(people[0]?.id ?? null);
  }, [people, selectedPersonId]);

  const hasUnsavedChanges = useMemo(() => (
    !sameAssignments(personSchedules, draftPersonSchedules)
    || !sameOverrides(overrides, draftOverrides)
  ), [personSchedules, draftPersonSchedules, overrides, draftOverrides]);

  const selectedPerson = people.find((item) => item.id === selectedPersonId);

  const selectPerson = (personId: string) => {
    if (selectedPersonId !== personId && hasUnsavedChanges) {
      setDraftPersonSchedules(personSchedules);
      setDraftOverrides(overrides);
    }
    setSelectedPersonId(personId);
  };

  const upsertAssignment = (personId: string, templateId: string | null) => {
    setDraftPersonSchedules((prev) => {
      const existing = prev.find((item) => item.personId === personId);
      if (!existing) return [...prev, { personId, templateId }];
      return prev.map((item) => item.personId === personId ? { ...item, templateId } : item);
    });
  };

  const upsertOverride = (dateISO: string, start: string | null, end: string | null) => {
    if (!selectedPersonId) return;
    setDraftOverrides((prev) => {
      const existing = prev.find((item) => item.personId === selectedPersonId && item.dateISO === dateISO);
      if (existing) {
        return prev.map((item) => item.id === existing.id ? { ...item, start, end } : item);
      }
      return [...prev, { id: crypto.randomUUID(), personId: selectedPersonId, dateISO, start, end }];
    });
  };

  const revertOverride = (dateISO: string) => {
    if (!selectedPersonId) return;
    setDraftOverrides((prev) => prev.filter((item) => !(item.personId === selectedPersonId && item.dateISO === dateISO)));
  };

  const resetDraft = () => {
    setDraftPersonSchedules(personSchedules);
    setDraftOverrides(overrides);
  };

  const saveDraft = () => {
    saveAllSchedules({ templates, personSchedules: draftPersonSchedules, overrides: draftOverrides });
  };

  return (
    <main className="dashboard-layout schedules-layout">
      <PeopleList
        people={people}
        functions={functions}
        templates={templates}
        personSchedules={draftPersonSchedules}
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
        personSchedules={draftPersonSchedules}
        overrides={draftOverrides}
        weekStart={weekStart}
        isCurrentWeek={weekStart.getTime() === todayWeekStart.getTime()}
        hasUnsavedChanges={hasUnsavedChanges}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
        onCurrentWeek={() => setWeekStart(todayWeekStart)}
        onTemplateChange={(templateId) => selectedPersonId ? upsertAssignment(selectedPersonId, templateId) : null}
        onOpenTemplateModal={() => setTemplateModalOpen(true)}
        onUpsertOverride={upsertOverride}
        onRevertOverride={revertOverride}
        onReset={resetDraft}
        onSave={saveDraft}
      />

      <TemplateModal
        open={templateModalOpen}
        templates={templates}
        onClose={() => setTemplateModalOpen(false)}
        onSave={(nextTemplates) => {
          const sanitize = (rows: PersonSchedule[]) => rows.map((item) => nextTemplates.some((tpl) => tpl.id === item.templateId) ? item : { ...item, templateId: null });
          const nextSavedPersonSchedules = sanitize(personSchedules);
          const nextDraftPersonSchedules = sanitize(draftPersonSchedules);
          saveAllSchedules({ templates: nextTemplates, personSchedules: nextSavedPersonSchedules, overrides });
          setDraftPersonSchedules(nextDraftPersonSchedules);
        }}
      />
    </main>
  );
};
