import { useMemo, useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Function, Role, ScheduleTemplate } from '../../types';
import { createTemplate } from '../../lib/scheduleUtils';
import { TemplateModal } from '../schedules/TemplateModal';

type Props = {
  roles: Role[];
  functions: Function[];
  templates: ScheduleTemplate[];
  onSaveTemplates: (templates: ScheduleTemplate[]) => void;
  onCreateRole: (name: string, color?: string) => string;
  onRenameRole: (roleId: string, name: string) => void;
  onDeleteRole: (roleId: string) => boolean;
  onCreateFunction: (roleId: string, name: string) => void;
  onRenameFunction: (functionId: string, name: string) => void;
  onDeleteFunction: (functionId: string) => boolean;
};

type ModalState =
  | { type: 'create-role' }
  | { type: 'edit-role'; roleId: string; initial: string }
  | { type: 'delete-role'; roleId: string }
  | { type: 'create-function'; roleId: string }
  | { type: 'edit-function'; functionId: string; initial: string }
  | { type: 'delete-function'; functionId: string }
  | null;

export const PersonalPage = ({ roles, functions, templates, onSaveTemplates, onCreateRole, onRenameRole, onDeleteRole, onCreateFunction, onRenameFunction, onDeleteFunction }: Props) => {
  const groupedFunctions = useMemo(() => new Map(roles.map((role) => [role.id, functions.filter((fn) => fn.roleId === role.id)])), [roles, functions]);
  const [modal, setModal] = useState<ModalState>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateToEditId, setTemplateToEditId] = useState<string | null>(null);

  const openModal = (next: ModalState, value = '') => {
    setModal(next);
    setNameDraft(value);
  };

  return (
    <main className="dashboard-layout personal-layout">
      <section className="card personal-section roles-section">
        <div className="section-head">
          <h3>Roles y funciones</h3>
          <button className="icon-btn" onClick={() => openModal({ type: 'create-role' })} aria-label="Crear rol" title="Crear rol"><Plus size={14} /></button>
        </div>
        <div className="role-tree">
          {roles.map((role) => (
            <div className="role-tree-item" key={role.id}>
              <div className="role-row">
                <strong>{role.nombre}</strong>
                <div className="tree-actions">
                  <button className="icon-btn" onClick={() => openModal({ type: 'create-function', roleId: role.id })} aria-label="Agregar función" title="Agregar función"><Plus size={14} /></button>
                  <button className="icon-btn" onClick={() => openModal({ type: 'edit-role', roleId: role.id, initial: role.nombre }, role.nombre)} aria-label="Editar rol" title="Editar rol"><Pencil size={14} /></button>
                  <button className="icon-btn danger-icon" onClick={() => openModal({ type: 'delete-role', roleId: role.id })} aria-label="Eliminar rol" title="Eliminar rol"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="function-tree-list">
                {(groupedFunctions.get(role.id) ?? []).map((fn) => (
                  <div className="function-row" key={fn.id}>
                    <span>{fn.nombre}</span>
                    <div className="tree-actions">
                      <button className="icon-btn" onClick={() => openModal({ type: 'edit-function', functionId: fn.id, initial: fn.nombre }, fn.nombre)} aria-label="Editar función" title="Editar función"><Pencil size={14} /></button>
                      <button className="icon-btn danger-icon" onClick={() => openModal({ type: 'delete-function', functionId: fn.id })} aria-label="Eliminar función" title="Eliminar función"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card personal-section templates-section">
        <div className="section-head">
          <h3>Plantillas de turnos</h3>
          <button className="icon-btn" onClick={() => onSaveTemplates([...templates, createTemplate(`Nueva plantilla ${templates.length + 1}`)])} aria-label="Crear plantilla" title="Crear plantilla"><Plus size={14} /></button>
        </div>
        <div className="template-compact-list">
          {templates.map((template) => (
            <div className="template-compact-item" key={template.id}>
              <span>{template.name}</span>
              <div className="tree-actions">
                <button
                  className="icon-btn"
                  onClick={() => {
                    setTemplateToEditId(template.id);
                    setTemplateModalOpen(true);
                  }}
                  aria-label="Editar plantilla"
                  title="Editar plantilla"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    const copyName = `${template.name} (copia)`;
                    const duplicate = { ...template, id: crypto.randomUUID(), name: copyName, days: { mon: { ...template.days.mon }, tue: { ...template.days.tue }, wed: { ...template.days.wed }, thu: { ...template.days.thu }, fri: { ...template.days.fri }, sat: { ...template.days.sat }, sun: { ...template.days.sun } } };
                    onSaveTemplates([...templates, duplicate]);
                  }}
                  aria-label="Duplicar plantilla"
                  title="Duplicar plantilla"
                >
                  <Copy size={14} />
                </button>
                <button className="icon-btn danger-icon" onClick={() => onSaveTemplates(templates.filter((item) => item.id !== template.id))} aria-label="Eliminar plantilla" title="Eliminar plantilla"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modal ? <div className="modal-backdrop" role="dialog" aria-modal="true">
        <section className="modal compact-modal">
          <h3>
            {modal.type === 'create-role' ? 'Crear rol' : null}
            {modal.type === 'edit-role' ? 'Editar rol' : null}
            {modal.type === 'delete-role' ? 'Eliminar rol' : null}
            {modal.type === 'create-function' ? 'Crear función' : null}
            {modal.type === 'edit-function' ? 'Editar función' : null}
            {modal.type === 'delete-function' ? 'Eliminar función' : null}
          </h3>

          {modal.type.includes('delete') ? <p className="empty-state">Confirma la acción para continuar.</p> : <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="Nombre" />}

          <div className="modal-actions">
            <button className="icon-btn" onClick={() => setModal(null)} aria-label="Cancelar" title="Cancelar"><X size={14} /></button>
            <button className={`icon-btn ${modal.type.includes('delete') ? 'danger-icon' : 'primary'}`} onClick={() => {
              if (modal.type === 'create-role' && nameDraft.trim()) onCreateRole(nameDraft.trim());
              if (modal.type === 'edit-role' && nameDraft.trim()) onRenameRole(modal.roleId, nameDraft.trim());
              if (modal.type === 'create-function' && nameDraft.trim()) onCreateFunction(modal.roleId, nameDraft.trim());
              if (modal.type === 'edit-function' && nameDraft.trim()) onRenameFunction(modal.functionId, nameDraft.trim());
              if (modal.type === 'delete-role' && !onDeleteRole(modal.roleId)) window.alert('Reasigna trabajadores antes de eliminar');
              if (modal.type === 'delete-function' && !onDeleteFunction(modal.functionId)) window.alert('La función está en uso en Horarios.');
              setModal(null);
            }} aria-label="Confirmar" title="Confirmar">
              {modal.type.includes('delete') ? <Trash2 size={14} /> : <Check size={14} />}
            </button>
          </div>
        </section>
      </div> : null}

      <TemplateModal
        open={templateModalOpen}
        templates={templates}
        selectedTemplateId={templateToEditId}
        onClose={() => {
          setTemplateModalOpen(false);
          setTemplateToEditId(null);
        }}
        onSave={onSaveTemplates}
      />
    </main>
  );
};
