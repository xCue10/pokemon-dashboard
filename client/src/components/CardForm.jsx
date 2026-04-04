import { useState, useEffect, useCallback } from 'react';
import { searchPokemon } from '../utils/api';
import { formatDateInput } from '../utils/format';
import toast from 'react-hot-toast';

const CONDITIONS = [
  'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'PSA 6', 'PSA 5', 'PSA 4', 'PSA 3', 'PSA 2', 'PSA 1',
  'Raw Gem Mint', 'Raw NM/MT', 'Raw NM', 'Raw EX/MT', 'Raw EX', 'Raw VG/EX', 'Raw VG', 'Raw Good', 'Raw Poor',
];

const EMPTY = {
  name: '', set_name: '', card_number: '', condition: '', quantity: 1,
  purchase_price: '', purchase_date: '', notes: '',
  pokemon_tcg_id: '', market_price: '', image_url: '', set_id: '',
};

export default function CardForm({ card, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setForm({
        name: card.name || '',
        set_name: card.set_name || '',
        card_number: card.card_number || '',
        condition: card.condition || '',
        quantity: card.quantity || 1,
        purchase_price: card.purchase_price || '',
        purchase_date: formatDateInput(card.purchase_date),
        notes: card.notes || '',
        pokemon_tcg_id: card.pokemon_tcg_id || '',
        market_price: card.market_price || '',
        image_url: card.image_url || '',
        set_id: card.set_id || '',
      });
    }
  }, [card]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSearch = useCallback(async () => {
    if (!form.name.trim()) return;
    setSearching(true);
    setShowSearch(true);
    try {
      const res = await searchPokemon({ q: form.name, pageSize: 12 });
      setSearchResults(res.cards || []);
    } catch (err) {
      toast.error('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  }, [form.name]);

  const selectCard = (tcgCard) => {
    setForm(f => ({
      ...f,
      name: tcgCard.name,
      set_name: tcgCard.set_name || f.set_name,
      card_number: tcgCard.card_number || f.card_number,
      pokemon_tcg_id: tcgCard.id,
      market_price: tcgCard.market_price || f.market_price,
      image_url: tcgCard.image_url || f.image_url,
      set_id: tcgCard.set_id || f.set_id,
    }));
    setShowSearch(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Card name is required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        quantity: parseInt(form.quantity) || 1,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        market_price: form.market_price ? parseFloat(form.market_price) : null,
        purchase_date: form.purchase_date || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{card ? 'Edit Card' : 'Add Card'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {card ? 'Update card details' : 'Add a new card to your collection'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="modal-body">
          {/* TCG Image Preview */}
          {form.image_url && (
            <div className="flex justify-center mb-4">
              <img src={form.image_url} alt={form.name} className="h-40 object-contain rounded-lg shadow-md" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Search */}
            <div>
              <label className="label">Card Name *</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  placeholder="e.g. Charizard"
                  required
                />
                <button type="button" onClick={handleSearch} disabled={searching} className="btn-secondary whitespace-nowrap text-sm px-3">
                  {searching ? <span className="spinner" /> : '🔍 Search TCG'}
                </button>
              </div>
            </div>

            {/* TCG Search Results */}
            {showSearch && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-600">
                    {searching ? 'Searching…' : `${searchResults.length} results`}
                  </span>
                  <button type="button" onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
                {!searching && searchResults.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">No results found</p>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 max-h-64 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCard(c)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-pokemon-red transition-all"
                    >
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name} className="h-20 object-contain" />
                      )}
                      <span className="text-xs text-center text-gray-700 leading-tight font-medium">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.set_name}</span>
                      {c.market_price && (
                        <span className="text-xs font-semibold text-pokemon-red">${c.market_price}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Set + Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Set Name</label>
                <input className="input" value={form.set_name} onChange={e => set('set_name', e.target.value)} placeholder="e.g. Base Set" />
              </div>
              <div>
                <label className="label">Card Number</label>
                <input className="input" value={form.card_number} onChange={e => set('card_number', e.target.value)} placeholder="e.g. 4/102" />
              </div>
            </div>

            {/* Condition + Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Condition</label>
                <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
                  <option value="">Select condition</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input className="input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Purchase Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Market Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.market_price} onChange={e => set('market_price', e.target.value)} placeholder="Auto-fetched" />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="label">Purchase Date</label>
              <input className="input" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
            </div>

            {/* Pokemon TCG ID (collapsible) */}
            <details className="text-sm">
              <summary className="text-gray-500 cursor-pointer select-none hover:text-gray-700">Advanced (TCG API)</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="label">Pokemon TCG ID</label>
                  <input className="input font-mono text-xs" value={form.pokemon_tcg_id} onChange={e => set('pokemon_tcg_id', e.target.value)} placeholder="e.g. base1-4" />
                </div>
                <div>
                  <label className="label">Image URL</label>
                  <input className="input text-xs" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
                </div>
              </div>
            </details>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><span className="spinner mr-2" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Saving…</> : card ? 'Save Changes' : 'Add Card'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
