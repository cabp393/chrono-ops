import { useEffect, useState } from 'react';
import { dayLabel } from '../engine.js';

export default function DayEditorPanel({ day, onSave }) {
  const [localDay, setLocalDay] = useState(day);

  useEffect(() => {
    setLocalDay(day);
  }, [day]);

  const updateBlock = (blockId, patch) => {
    setLocalDay((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b))
    }));
  };

  const addBlock = () => {
    setLocalDay((prev) => ({
      ...prev,
      isOff: false,
      blocks: [...prev.blocks, { id: crypto.randomUUID(), start: '09:00', end: '17:00', breakMinutes: undefined, label: '' }]
    }));
  };

  const removeBlock = (id) => {
    setLocalDay((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id)
    }));
  };

  if (!localDay) return null;

  return (
    <aside className="panel side-panel">
      <div className="panel-title">
        <h2>Day Editor · {dayLabel(localDay.dateISO)}</h2>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={localDay.isOff}
          onChange={(e) => setLocalDay((prev) => ({ ...prev, isOff: e.target.checked, blocks: e.target.checked ? [] : prev.blocks }))}
        />
        Mark Off
      </label>

      {!localDay.isOff && (
        <div className="editor-blocks">
          {localDay.blocks.map((block) => (
            <div key={block.id} className="editor-row">
              <input type="time" value={block.start} onChange={(e) => updateBlock(block.id, { start: e.target.value })} />
              <input type="time" value={block.end} onChange={(e) => updateBlock(block.id, { end: e.target.value })} />
              <input
                type="number"
                min="0"
                placeholder="Break"
                value={block.breakMinutes ?? ''}
                onChange={(e) => updateBlock(block.id, { breakMinutes: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
              <input
                placeholder="Label"
                value={block.label || ''}
                onChange={(e) => updateBlock(block.id, { label: e.target.value })}
              />
              <button className="secondary" onClick={() => removeBlock(block.id)}>x</button>
            </div>
          ))}
          <button className="secondary" onClick={addBlock}>+ Add block</button>
        </div>
      )}

      <button onClick={() => onSave(localDay)}>Save Day</button>
    </aside>
  );
}
