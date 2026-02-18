import { useEffect, useState } from 'react';
import type { Function, Person, PersonSchedule, ScheduleOverride, ScheduleTemplate } from '../../types';
import { addDays, startOfWeekMonday } from '../../lib/dateUtils';
import type { ScheduleData } from '../../lib/scheduleStorage';
import { PeopleList } from './PeopleList';
import { PersonScheduleEditor } from './PersonScheduleEditor';
import { TemplateModal } from './TemplateModal';

const todayWeekStart = startOfWeekMonday(new Date());

type Props = {
  people: Person[];
  functions: Function[];
  scheduleData: ScheduleData;
  onScheduleDataChange: (next: ScheduleData) => void;
};

const sameAssignments = (a: PersonSchedule[], b: PersonSchedule[]) => JSON.stringify(a) === JSON.stringify(b);
const sameOverrides = (a: ScheduleOverride[], b: ScheduleOverride[]) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, functions, scheduleData, onScheduleDataChange }: Props) => {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [draftPersonSchedules, setDraftPersonSchedules] = useState<PersonSchedule[]>(scheduleData.personSchedules);
  const [draftOverrides, setDraftOverrides] = useState<ScheduleOverride[]>(scheduleData.overrides);

  useEffect(() => {
    setDraftPersonSchedules(scheduleData.personSchedules);
    setDraftOverrides(scheduleData.overrides);
  }, [scheduleData.personSchedules, scheduleData.overrides]);

  const hasUnsavedChanges = !sameAssignments(scheduleData.personSchedules, draftPersonSchedules)
    || !sameOverrides(scheduleData.overrides, draftOverrides);

  const selectedPerson = people.find((item) => item.id === selectedPersonId);

  const selectPerson = (personId: string) => {
    if (selectedPersonId !== personId && hasUnsavedChanges) {
      setDraftPersonSchedules(scheduleData.personSchedules);
      setDraftOverrides(scheduleData.overrides);
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
    setDraftPersonSchedules(scheduleData.personSchedules);
    setDraftOverrides(scheduleData.overrides);
  };

  const saveDraft = () => {
    onScheduleDataChange({
      templates: scheduleData.templates,
      personSchedules: draftPersonSchedules,
      overrides: draftOverrides
    });
  };

  return (
    <main className="dashboard-layout schedules-layout">
      <PeopleList
        people={people}
        functions={functions}
        templates={scheduleData.templates}
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
        templates={scheduleData.templates}
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
        templates={scheduleData.templates}
        onClose={() => setTemplateModalOpen(false)}
        onSave={(templates) => {
          const sanitize = (rows: PersonSchedule[]) => rows.map((item) => templates.some((tpl) => tpl.id === item.templateId) ? item : { ...item, templateId: null });
          const nextSavedSchedules = sanitize(scheduleData.personSchedules);
          const nextDraftSchedules = sanitize(draftPersonSchedules);
          setDraftPersonSchedules(nextDraftSchedules);
          onScheduleDataChange({ templates, personSchedules: nextSavedSchedules, overrides: scheduleData.overrides });
        }}
      />
    </main>
  );
};
