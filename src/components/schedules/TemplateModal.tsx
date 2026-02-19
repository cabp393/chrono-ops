import { useEffect, useMemo, useState } from 'react';
import { DAY_KEYS, DAY_LABELS, cloneTemplate, createTemplate, formatSlot, slotValidationError } from '../../lib/scheduleUtils';
import type { ScheduleDaySlot, ScheduleTemplate } from '../../types';
import { TimeInput24 } from '../TimeInput24';

type Props = {
  open: boolean;
  templates: ScheduleTemplate[];
  onClose: () => void;
  onSave: (templates: ScheduleTemplate[]) => void;
};

const clone = (templates: ScheduleTemplate[]) => templates.map((item) => cloneTemplate(item));

export const TemplateModal = ({ open, templates, onClose, onSave }: Props) => {
  const [draft, setDraft] = useState<ScheduleTemplate[]>(() => clone(templates));
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);

  const selected = useMemo(() => draft.find((item) => item.id === selectedId) ?? null, [draft, selectedId]);

  useEffect(() => {
    if (!open) return;
    const next = clone(templates);
    setDraft(next);
    setSelectedId(next[0]?.id ?? null);
  }, [open, templates]);

  if (!open) return null;

  const hasInvalidSlots = draft.some((template) => DAY_KEYS.some((dayKey) => !!slotValidationError(template.days[dayKey])));

  const resetFromProps = () => {
    const next = clone(templates);
    setDraft(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const setDaySlot = (dayKey: keyof ScheduleTemplate['days'], next: ScheduleDaySlot) => {
    if (!selected) return;
    setDraft((prev) => prev.map((template) => template.id === selected.id ? { ...template, days: { ...template.days, [dayKey]: next } } : template));
  };

  const applyQuick = (kind: 'copy-mon' | 'workdays' | 'clear') => {
    if (!selected) return;
    setDraft((prev) => prev.map((template) => {
      if (template.id !== selected.id) return template;
      if (kind === 'clear') {
        return {
          ...template,
          days: { mon: { start: null, end: null }, tue: { start: null, end: null }, wed: { start: null, end: null }, thu: { start: null, end: null }, fri: { start: null, end: null }, sat: { start: null, end: null }, sun: { start: null, end: null } }
        };
      }
      if (kind === 'copy-mon') {
        const monday = template.days.mon;
        return { ...template, days: { mon: { ...monday }, tue: { ...monday }, wed: { ...monday }, thu: { ...monday }, fri: { ...monday }, sat: { ...monday }, sun: { ...monday } } };
      }
      return {
        ...template,
        days: {
          ...template.days,
          mon: { start: '09:00', end: '18:00' },
          tue: { start: '09:00', end: '18:00' },
          wed: { start: '09:00', end: '18:00' },
          thu: { start: '09:00', end: '18:00' },
          fri: { start: '09:00', end: '18:00' },
          sat: { start: null, end: null },
          sun: { start: null, end: null }
        }
      };
    }));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal templates-modal">
        <div className="templates-head">
          <h3>Plantillas</h3>
          <button onClick={() => { resetFromProps(); onClose(); }}>Cerrar</button>
        </div>

        <div className="templates-body">
          <aside className="template-list">
            {draft.map((template) => (
              <button key={template.id} className={`template-item ${selected?.id === template.id ? 'active' : ''}`} onClick={() => setSelectedId(template.id)}>
                <span>{template.name}</span>
              </button>
            ))}
            <button onClick={() => {
              const next = createTemplate(`Nueva plantilla ${draft.length + 1}`);
              setDraft((prev) => [...prev, next]);
              setSelectedId(next.id);
            }}>+ Crear plantilla</button>
          </aside>

          <div className="template-editor">
            {selected ? (
              <>
                <div className="template-editor-head">
                  <input value={selected.name} onChange={(event) => {
                    const name = event.target.value;
                    setDraft((prev) => prev.map((item) => item.id === selected.id ? { ...item, name } : item));
                  }} placeholder="Nombre de plantilla" />
                  <button onClick={() => {
                    const duplicate = cloneTemplate(selected);
                    duplicate.id = crypto.randomUUID();
                    duplicate.name = `${selected.name} (copia)`;
                    setDraft((prev) => [...prev, duplicate]);
                    setSelectedId(duplicate.id);
                  }}>Duplicar</button>
                  <button onClick={() => {
                    if (!window.confirm('¿Eliminar plantilla?')) return;
                    const filtered = draft.filter((item) => item.id !== selected.id);
                    setDraft(filtered);
                    setSelectedId(filtered[0]?.id ?? null);
                  }}>Eliminar</button>
                </div>

                <div className="template-quick-actions">
                  <button onClick={() => applyQuick('copy-mon')}>Copiar lunes a todos</button>
                  <button onClick={() => applyQuick('workdays')}>Lun–Vie</button>
                  <button onClick={() => applyQuick('clear')}>Limpiar</button>
                </div>

                <div className="template-days">
                  {DAY_KEYS.map((dayKey) => {
                    const slot = selected.days[dayKey];
                    return (
                      <div className="template-day-row" key={dayKey}>
                        <strong>{DAY_LABELS[dayKey]}</strong>
                        <TimeInput24 value={slot.start ?? ''} onChange={(value) => setDaySlot(dayKey, { start: value || null, end: slot.end })} step={60} />
                        <TimeInput24 value={slot.end ?? ''} onChange={(value) => setDaySlot(dayKey, { start: slot.start, end: value || null })} step={60} />
                        <button className="ghost" onClick={() => setDaySlot(dayKey, { start: null, end: null })}>Libre</button>
                        <span className="chip muted">{formatSlot(slot)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <p>No hay plantilla seleccionada.</p>}
          </div>
        </div>

        <div className="modal-actions">
          {hasInvalidSlots ? <p className="error">Corrige horas inválidas antes de guardar.</p> : null}
          <button className="ghost" onClick={() => { resetFromProps(); onClose(); }}>Cancelar</button>
          <button className="primary" disabled={hasInvalidSlots} onClick={() => { onSave(draft); onClose(); }}>Guardar y cerrar</button>
        </div>
      </section>
    </div>
  );
};
