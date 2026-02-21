import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Plus, Upload } from 'lucide-react';
import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, Role, ScheduleOverride, ScheduleTemplate } from '../../types';
import { formatWeekRange } from '../../lib/dateUtils';
import { DAY_KEYS, getDayKey, isValidSlot, toISODate } from '../../lib/scheduleUtils';
import { buildImportPreview, buildWeekExportRows, copyWeekData, EXPORT_COLUMNS, listWeeksWithData, parseImportSheet } from '../../lib/weekTransfer';
import { loadSheetJs } from '../../lib/sheetjs';
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
  onImportWeekConfirm: (next: {
    roles: Role[];
    functions: Function[];
    people: Person[];
    templates: ScheduleTemplate[];
    personWeekPlans: PersonWeekPlan[];
    personFunctionWeeks: PersonFunctionWeek[];
    overrides: ScheduleOverride[];
  }) => void;
  onCreatePerson: (payload: { nombre: string; roleId: string }) => void;
  onUpdatePerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
};

type ImportState = {
  fileName: string;
  preview: ReturnType<typeof buildImportPreview>['preview'];
  payload: ReturnType<typeof buildImportPreview>['applyPayload'];
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const SchedulesPage = ({ people, roles, functions, templates, personWeekPlans, personFunctionWeeks, overrides, weekStart, onChange, onImportWeekConfirm, onCreatePerson, onUpdatePerson, onDeletePerson }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [personDraft, setPersonDraft] = useState<{ nombre: string; roleId: string } | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceWeekISO, setCopySourceWeekISO] = useState('');
  const [importState, setImportState] = useState<ImportState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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


  useEffect(() => {
    if (selectedPersonId && !people.some((item) => item.id === selectedPersonId)) {
      setSelectedPersonId(null);
      setPersonDraft(null);
    }
  }, [people, selectedPersonId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const selectedPerson = people.find((item) => item.id === selectedPersonId);
  const personDraftChanged = !!selectedPerson && !!personDraft && (selectedPerson.nombre !== personDraft.nombre.trim() || selectedPerson.roleId !== personDraft.roleId);
  const hasUnsavedChanges = !same(personWeekPlans, draftWeekPlans) || !same(personFunctionWeeks, draftFunctionWeeks) || !same(overrides, draftOverrides) || personDraftChanged;
  const hasInvalidOverrides = draftOverrides.some((item) => !isValidSlot({ start: item.start, end: item.end }));
  const hasInvalidTemplates = templates.some((template) => DAY_KEYS.some((dayKey) => !isValidSlot(template.days[dayKey])));
  const hasInvalidSlots = hasInvalidOverrides || hasInvalidTemplates;

  const weekStartISO = toISODate(weekStart);
  const availableCopyWeeks = useMemo(
    () => listWeeksWithData(personWeekPlans, personFunctionWeeks, overrides),
    [personWeekPlans, personFunctionWeeks, overrides]
  );

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

  const exportCurrentWeek = async () => {
    try {
      const XLSX = await loadSheetJs();
      const rows = buildWeekExportRows({ weekStartISO, people, roles, functions, templates, personWeekPlans, personFunctionWeeks, overrides });
      const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_COLUMNS] });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Semana');
      XLSX.writeFile(workbook, `shiftboard_${weekStartISO}.xlsx`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'No fue posible exportar el archivo.');
    }
  };

  const openImportDialog = () => fileInputRef.current?.click();

  const onImportFile = async (file: File) => {
    try {
      const XLSX = await loadSheetJs();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      setImportState({
        fileName: file.name,
        preview: { importedWorkers: 0, newPeople: [], newRoles: [], newFunctions: [], newTemplates: [], warnings: [], errors: [{ rowNumber: 0, message: 'El archivo no contiene hojas.' }] },
        payload: { roles, functions, people, templates, personWeekPlans, personFunctionWeeks, overrides }
      });
      return;
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const parsed = parseImportSheet(rawRows);
    if (parsed.parsedRows.length === 0) {
      parsed.errors.push({ rowNumber: 0, message: 'No se detectaron filas válidas para importar.' });
    }
      const previewData = buildImportPreview({
      rows: parsed.parsedRows,
      weekStartISO,
      roles,
      functions,
      people,
      templates,
      personWeekPlans,
      personFunctionWeeks,
      overrides,
      parseErrors: parsed.errors
    });
      setImportState({ fileName: file.name, preview: previewData.preview, payload: previewData.applyPayload });
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'No fue posible importar el archivo.');
    }
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
        <div className="schedule-footer-actions">
          <button
            className="icon-btn schedule-action-btn"
            onClick={() => {
              setCopySourceWeekISO('');
              setCopyModalOpen(true);
            }}
            aria-label="Copiar semana"
            title="Copiar semana"
          >
            <Copy size={14} />
          </button>
          <button className="icon-btn schedule-action-btn" onClick={exportCurrentWeek} aria-label="Exportar semana" title="Exportar semana">
            <Download size={14} />
          </button>
          <button className="icon-btn schedule-action-btn" onClick={openImportDialog} aria-label="Importar semana" title="Importar semana">
            <Upload size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden-file-input"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (!file) return;
              await onImportFile(file);
            }}
          />
        </div>

        <button className="primary" onClick={() => setWorkerModalOpen(true)}><Plus size={14} />Añadir trabajador</button>
      </footer> : null}

      {copyModalOpen ? <div className="modal-backdrop" role="dialog" aria-modal="true">
        <section className="modal compact-modal">
          <h3>Copiar semana</h3>
          <p className="empty-state">Selecciona una semana origen para sobrescribir la semana activa ({formatWeekRange(weekStart)}).</p>
          <select value={copySourceWeekISO} onChange={(event) => setCopySourceWeekISO(event.target.value)}>
            <option value="">Seleccionar semana</option>
            {availableCopyWeeks.map((weekISO) => {
              const date = new Date(`${weekISO}T00:00:00`);
              return <option key={weekISO} value={weekISO}>{weekISO} · {formatWeekRange(date)}</option>;
            })}
          </select>
          <div className="modal-actions">
            <button onClick={() => setCopyModalOpen(false)}>Cancelar</button>
            <button
              className="primary"
              disabled={!copySourceWeekISO || copySourceWeekISO === weekStartISO}
              onClick={() => {
                if (!copySourceWeekISO || copySourceWeekISO === weekStartISO) return;
                const copied = copyWeekData({
                  sourceWeekISO: copySourceWeekISO,
                  targetWeekISO: weekStartISO,
                  personWeekPlans,
                  personFunctionWeeks,
                  overrides
                });
                onChange({ templates, ...copied });
                setCopyModalOpen(false);
                setToastMessage('Semana copiada correctamente.');
              }}
            >
              Confirmar
            </button>
          </div>
        </section>
      </div> : null}

      {importState ? <div className="modal-backdrop" role="dialog" aria-modal="true">
        <section className="modal import-preview-modal">
          <h3>Previsualización de importación</h3>
          <p className="empty-state">Archivo: {importState.fileName}</p>
          <div className="import-preview-grid">
            <p><strong>Total trabajadores importados:</strong> {importState.preview.importedWorkers}</p>
            <p><strong>Nuevas personas:</strong> {importState.preview.newPeople.length}</p>
            <p><strong>Nuevos roles:</strong> {importState.preview.newRoles.length}</p>
            <p><strong>Nuevas funciones:</strong> {importState.preview.newFunctions.length}</p>
            <p><strong>Nuevas plantillas:</strong> {importState.preview.newTemplates.length}</p>
          </div>

          <div className="import-preview-block">
            <strong>Advertencias</strong>
            {importState.preview.warnings.length === 0 ? <p className="empty-state">Sin advertencias.</p> : (
              <ul>
                {importState.preview.warnings.map((warning, index) => <li key={`${warning.rowNumber}-${warning.dayKey}-${index}`}>Fila {warning.rowNumber}: {warning.message}</li>)}
              </ul>
            )}
          </div>

          <div className="import-preview-block">
            <strong>Errores</strong>
            {importState.preview.errors.length === 0 ? <p className="empty-state">Sin errores bloqueantes.</p> : (
              <ul>
                {importState.preview.errors.map((error, index) => <li key={`${error.rowNumber}-${index}`}>{error.rowNumber > 0 ? `Fila ${error.rowNumber}: ` : ''}{error.message}</li>)}
              </ul>
            )}
          </div>

          <div className="modal-actions">
            <button onClick={() => setImportState(null)}>{importState.preview.errors.length > 0 ? 'Cerrar' : 'Cancelar'}</button>
            <button
              className="primary"
              disabled={importState.preview.errors.length > 0}
              onClick={() => {
                if (importState.preview.errors.length > 0) return;
                onImportWeekConfirm(importState.payload);
                setImportState(null);
                setToastMessage('Importación completada correctamente.');
              }}
            >
              Confirmar importación
            </button>
          </div>
        </section>
      </div> : null}

      {toastMessage ? <div className="schedule-toast" role="status" aria-live="polite">{toastMessage}</div> : null}

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
