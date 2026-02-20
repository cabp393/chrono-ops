import { useEffect, useMemo, useState } from 'react';
import { DAY_KEYS, DAY_LABELS, cloneTemplate, slotValidationError } from '../../lib/scheduleUtils';
import type { ScheduleDaySlot, ScheduleTemplate } from '../../types';
import { TimeInput24 } from '../TimeInput24';

type Props = {
  open: boolean;
  templates: ScheduleTemplate[];
  selectedTemplateId: string | null;
  onClose: () => void;
  onSave: (templates: ScheduleTemplate[]) => void;
};

const clone = (templates: ScheduleTemplate[]) => templates.map((item) => cloneTemplate(item));

export const TemplateModal = ({ open, templates, selectedTemplateId, onClose, onSave }: Props) => {
  const [draft, setDraft] = useState<ScheduleTemplate[]>(() => clone(templates));
  const [editingId, setEditingId] = useState<string | null>(selectedTemplateId ?? templates[0]?.id ?? null);

  const selected = useMemo(() => draft.find((item) => item.id === editingId) ?? null, [draft, editingId]);

  useEffect(() => {
    if (!open) return;
    const next = clone(templates);
    setDraft(next);
    setEditingId(selectedTemplateId ?? next[0]?.id ?? null);
  }, [open, templates, selectedTemplateId]);

  if (!open) return null;

  const hasInvalidSlots = draft.some((template) => DAY_KEYS.some((dayKey) => !!slotValidationError(template.days[dayKey])));

  const resetFromProps = () => {
    const next = clone(templates);
    setDraft(next);
    setEditingId(selectedTemplateId ?? next[0]?.id ?? null);
  };

  const setDaySlot = (dayKey: keyof ScheduleTemplate['days'], next: ScheduleDaySlot) => {
    if (!selected) return;
    setDraft((prev) => prev.map((template) => template.id === selected.id ? { ...template, days: { ...template.days, [dayKey]: next } } : template));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal templates-modal compact-template-modal">
        <div className="templates-head">
          <h3>Editar plantilla</h3>
        </div>

        <div className="template-editor">
          {selected ? (
            <>
              <div className="template-editor-head simple">
                <input
                  value={selected.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setDraft((prev) => prev.map((item) => item.id === selected.id ? { ...item, name } : item));
                  }}
                  placeholder="Nombre de plantilla"
                />
              </div>

              <div className="template-days compact-days">
                {DAY_KEYS.map((dayKey) => {
                  const slot = selected.days[dayKey];
                  const invalid = !!slotValidationError(slot);
                  return (
                    <article key={dayKey} className={`week-day-row compact template-day-line ${invalid ? 'invalid' : ''}`}>
                      <strong>{DAY_LABELS[dayKey]}</strong>
                      <TimeInput24 value={slot.start ?? ''} onChange={(value) => setDaySlot(dayKey, { start: value || null, end: slot.end })} step={60} />
                      <TimeInput24 value={slot.end ?? ''} onChange={(value) => setDaySlot(dayKey, { start: slot.start, end: value || null })} step={60} />
                    </article>
                  );
                })}
              </div>
            </>
          ) : <p className="empty-state">Plantilla no encontrada.</p>}
        </div>

        <div className="modal-actions">
          {hasInvalidSlots ? <p className="error">Corrige horas inválidas antes de guardar.</p> : null}
          <button className="ghost" onClick={() => { resetFromProps(); onClose(); }}>Cancelar</button>
          <button className="primary" disabled={hasInvalidSlots || !selected} onClick={() => { onSave(draft); onClose(); }}>Guardar y cerrar</button>
        </div>
      </section>
    </div>
  );
};
