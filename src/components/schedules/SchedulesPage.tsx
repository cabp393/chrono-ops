import { useEffect, useState } from 'react';
import type { Function, Person, PersonSchedule, ScheduleOverride, ScheduleTemplate } from '../../types';
import { addDays, startOfWeekMonday } from '../../lib/dateUtils';
import { loadScheduleData, saveScheduleData } from '../../lib/scheduleStorage';
import { PeopleList } from './PeopleList';
import { PersonScheduleEditor } from './PersonScheduleEditor';
import { TemplateModal } from './TemplateModal';

const todayWeekStart = startOfWeekMonday(new Date());

type Props = {
  people: Person[];
  functions: Function[];
};

const sameAssignments = (a: PersonSchedule[], b: PersonSchedule[]) => JSON.stringify(a) === JSON.stringify(b);
const sameOverrides = (a: ScheduleOverride[], b: ScheduleOverride[]) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, functions }: Props) => {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [savedTemplates, setSavedTemplates] = useState<ScheduleTemplate[]>([]);
  const [savedPersonSchedules, setSavedPersonSchedules] = useState<PersonSchedule[]>([]);
  const [savedOverrides, setSavedOverrides] = useState<ScheduleOverride[]>([]);

  const [draftPersonSchedules, setDraftPersonSchedules] = useState<PersonSchedule[]>([]);
  const [draftOverrides, setDraftOverrides] = useState<ScheduleOverride[]>([]);

  useEffect(() => {
    const loaded = loadScheduleData(people);
    setSavedTemplates(loaded.templates);
    setSavedPersonSchedules(loaded.personSchedules);
    setSavedOverrides(loaded.overrides);
    setDraftPersonSchedules(loaded.personSchedules);
    setDraftOverrides(loaded.overrides);
  }, [people]);

  const hasUnsavedChanges = !sameAssignments(savedPersonSchedules, draftPersonSchedules)
    || !sameOverrides(savedOverrides, draftOverrides);

  const selectedPerson = people.find((item) => item.id === selectedPersonId);

  const selectPerson = (personId: string) => {
    if (selectedPersonId !== personId && hasUnsavedChanges) {
      setDraftPersonSchedules(savedPersonSchedules);
      setDraftOverrides(savedOverrides);
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
    setDraftPersonSchedules(savedPersonSchedules);
    setDraftOverrides(savedOverrides);
  };

  const saveDraft = () => {
    const next = { templates: savedTemplates, personSchedules: draftPersonSchedules, overrides: draftOverrides };
    setSavedPersonSchedules(draftPersonSchedules);
    setSavedOverrides(draftOverrides);
    saveScheduleData(next);
  };

  return (
    <main className="dashboard-layout schedules-layout">
      <PeopleList
        people={people}
        functions={functions}
        templates={savedTemplates}
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
        templates={savedTemplates}
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
        templates={savedTemplates}
        onClose={() => setTemplateModalOpen(false)}
        onSave={(templates) => {
          const sanitize = (rows: PersonSchedule[]) => rows.map((item) => templates.some((tpl) => tpl.id === item.templateId) ? item : { ...item, templateId: null });
          const nextSavedSchedules = sanitize(savedPersonSchedules);
          const nextDraftSchedules = sanitize(draftPersonSchedules);
          setSavedTemplates(templates);
          setSavedPersonSchedules(nextSavedSchedules);
          setDraftPersonSchedules(nextDraftSchedules);
          saveScheduleData({ templates, personSchedules: nextSavedSchedules, overrides: savedOverrides });
        }}
      />
    </main>
  );
};
