import React, { useState, useEffect } from 'react';
import { Check, Plus, X, Loader2, Trash2, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

/**
 * CharacterPicker — reusable character selection grid.
 *
 * Props:
 *   value       — array of selected character objects
 *   onChange    — callback(newSelection: character[])
 *   maxSelect  — max characters selectable (default 3)
 */
export default function CharacterPicker({ value = [], onChange, maxSelect = 3 }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCharacters = async () => {
    try {
      const res = await apiFetch('/api/characters');
      const data = await res.json();
      setCharacters(data.characters || []);
    } catch (err) {
      console.warn('Failed to load characters:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCharacters(); }, []);

  const isSelected = (id) => value.some(c => c.id === id);

  const toggle = (char) => {
    if (isSelected(char.id)) {
      onChange(value.filter(c => c.id !== char.id));
    } else if (value.length < maxSelect) {
      onChange([...value, char]);
    }
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addUrl.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), image_url: addUrl.trim() }),
      });
      const data = await res.json();
      if (data.character) {
        setCharacters(prev => [data.character, ...prev]);
        setAddName('');
        setAddUrl('');
        setShowAdd(false);
      }
    } catch (err) {
      console.warn('Failed to add character:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/characters/${id}`, { method: 'DELETE' });
      setCharacters(prev => prev.filter(c => c.id !== id));
      onChange(value.filter(c => c.id !== id));
    } catch (err) {
      console.warn('Failed to delete character:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-slate-400 py-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading characters...
      </div>
    );
  }

  return (
    <div>
      {/* Selected summary */}
      {value.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-bold text-teal-700 uppercase">
            {value.length} character{value.length > 1 ? 's' : ''} assigned
          </span>
          {value.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 border border-teal-200 rounded text-[9px] text-teal-700 font-medium">
              {c.name}
              <button onClick={() => onChange(value.filter(v => v.id !== c.id))} className="text-teal-400 hover:text-red-500">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Character grid */}
      <div className="flex gap-2 flex-wrap items-start">
        {characters.map(char => {
          const selected = isSelected(char.id);
          const disabled = !selected && value.length >= maxSelect;
          return (
            <button
              key={char.id}
              onClick={() => !disabled && toggle(char)}
              className={`relative group w-14 text-center transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              title={char.description ? `${char.name}: ${char.description.slice(0, 120)}...` : char.name}
            >
              <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                selected ? 'border-teal-500 ring-2 ring-teal-300/50' : 'border-slate-200 group-hover:border-slate-400'
              }`}>
                <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                {selected && (
                  <div className="absolute inset-0 w-14 h-14 rounded-full bg-teal-500/30 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white drop-shadow" />
                  </div>
                )}
              </div>
              <div className="text-[9px] font-medium text-slate-600 mt-1 truncate">{char.name}</div>
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, char.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </button>
          );
        })}

        {/* Add button */}
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-[#2C666E] hover:text-[#2C666E] transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase">Add Character</span>
            <button onClick={() => { setShowAdd(false); setAddName(''); setAddUrl(''); }}
              className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="Character name..."
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] mb-1.5 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E]/20 outline-none"
          />
          <input
            value={addUrl}
            onChange={e => setAddUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] mb-2 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E]/20 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!addName.trim() || !addUrl.trim() || saving}
            className="px-3 py-1.5 bg-[#2C666E] text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 hover:bg-[#234f56] transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            {saving ? 'Saving...' : 'Save Character'}
          </button>
        </div>
      )}

      {characters.length === 0 && !showAdd && (
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <Users className="w-3 h-3" /> No saved characters yet. Click + to add one.
        </div>
      )}
    </div>
  );
}
