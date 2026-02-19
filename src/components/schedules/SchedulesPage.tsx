import { useEffect, useMemo, useState } from 'react';
import type { Function, Person, PersonWeekPlan, ScheduleOverride } from '../../types';
import { addDays, startOfWeekMonday } from '../../lib/dateUtils';
import { toISODate } from '../../lib/scheduleUtils';
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

const samePlans = (a: PersonWeekPlan[], b: PersonWeekPlan[]) => JSON.stringify(a) === JSON.stringify(b);
const sameOverrides = (a: ScheduleOverride[], b: ScheduleOverride[]) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, functions, scheduleData, onScheduleDataChange }: Props) => {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [draftWeekPlans, setDraftWeekPlans] = useState<PersonWeekPlan[]>(scheduleData.personWeekPlans);
  const [draftOverrides, setDraftOverrides] = useState<ScheduleOverride[]>(scheduleData.overrides);

  useEffect(() => {
    setDraftWeekPlans(scheduleData.personWeekPlans);
    setDraftOverrides(scheduleData.overrides);
  }, [scheduleData.personWeekPlans, scheduleData.overrides]);

  const hasUnsavedChanges = !samePlans(scheduleData.personWeekPlans, draftWeekPlans)
    || !sameOverrides(scheduleData.overrides, draftOverrides);

  const weekStartISO = toISODate(weekStart);
  const selectedPerson = people.find((item) => item.id === selectedPersonId);
  const selectedWeekPlan = useMemo(
    () => draftWeekPlans.find((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO),
    [draftWeekPlans, selectedPersonId, weekStartISO]
  );

  const selectPerson = (personId: string) => {
    if (selectedPersonId !== personId && hasUnsavedChanges) {
      setDraftWeekPlans(scheduleData.personWeekPlans);
      setDraftOverrides(scheduleData.overrides);
    }
    setSelectedPersonId(personId);
  };

  const upsertWeekPlan = (next: { templateId?: string | null; functionId?: string | null }) => {
    if (!selectedPersonId) return;
    setDraftWeekPlans((prev) => {
      const current = prev.find((item) => item.personId === selectedPersonId && item.weekStartISO === weekStartISO);
      if (!current) {
        return [...prev, {
          personId: selectedPersonId,
          weekStartISO,
          templateId: next.templateId ?? null,
          functionId: next.functionId ?? null
        }];
      }
      return prev.map((item) => {
        if (item.personId !== selectedPersonId || item.weekStartISO !== weekStartISO) return item;
        return {
          ...item,
          templateId: next.templateId === undefined ? item.templateId : next.templateId,
          functionId: next.functionId === undefined ? item.functionId : next.functionId
        };
      });
    });
  };

  const upsertOverride = (dateISO: string, start: string | null, end: string | null) => {
    if (!selectedPersonId || !selectedWeekPlan) return;
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
    setDraftWeekPlans(scheduleData.personWeekPlans);
    setDraftOverrides(scheduleData.overrides);
  };

  const saveDraft = () => {
    onScheduleDataChange({
      templates: scheduleData.templates,
      personWeekPlans: draftWeekPlans,
      overrides: draftOverrides
    });
  };

  return (
    <main className="dashboard-layout schedules-layout">
      <PeopleList
        people={people}
        functions={functions}
        templates={scheduleData.templates}
        personWeekPlans={draftWeekPlans}
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
        weekPlan={selectedWeekPlan}
        overrides={draftOverrides}
        weekStart={weekStart}
        isCurrentWeek={weekStart.getTime() === todayWeekStart.getTime()}
        hasUnsavedChanges={hasUnsavedChanges}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
        onCurrentWeek={() => setWeekStart(todayWeekStart)}
        onTemplateChange={(templateId) => upsertWeekPlan({ templateId })}
        onFunctionChange={(functionId) => upsertWeekPlan({ functionId })}
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
          const sanitize = (rows: PersonWeekPlan[]) => rows.map((item) => templates.some((tpl) => tpl.id === item.templateId)
            ? item
            : { ...item, templateId: null });
          const nextSavedPlans = sanitize(scheduleData.personWeekPlans);
          const nextDraftPlans = sanitize(draftWeekPlans);
          setDraftWeekPlans(nextDraftPlans);
          onScheduleDataChange({ templates, personWeekPlans: nextSavedPlans, overrides: scheduleData.overrides });
        }}
      />
    </main>
  );
};
