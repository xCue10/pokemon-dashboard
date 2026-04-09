import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CONDITIONS = [
  'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'PSA 6', 'PSA 5', 'PSA 4', 'PSA 3', 'PSA 2', 'PSA 1',
  'Raw Gem Mint', 'Raw NM/MT', 'Raw NM', 'Raw EX/MT', 'Raw EX', 'Raw VG/EX', 'Raw VG', 'Raw Good', 'Raw Poor',
];

const EMPTY = {
  name: '', set_name: '', card_number: '', condition: '', quantity: 1,
  target_price: '', market_price: '', image_url: '', notes: '', priority: 'medium',
};

export default function WishlistForm({ item, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        set_name: item.set_name || '',
        card_number: item.card_number || '',
        condition: item.condition || '',
        quantity: item.quantity || 1,
        target_price: item.target_price || '',
        market_price: item.market_price || '',
        image_url: item.image_url || '',
        notes: item.notes || '',
        priority: item.priority || 'medium',
      });
    }
  }, [item]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Card name is required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        quantity: parseInt(form.quantity) || 1,
        target_price: form.target_price ? parseFloat(form.target_price) : null,
        market_price: form.market_price ? parseFloat(form.market_price) : null,
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
            <h2 className="text-lg font-bold text-gray-900">{item ? 'Edit Wishlist Item' : 'Add to Wishlist'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Cards you want to buy next</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="modal-body">
          {form.image_url && (
            <div className="flex justify-center mb-4">
              <img src={form.image_url} alt={form.name} className="h-40 object-contain rounded-lg shadow-md" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">Card Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Charizard"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="label">Priority</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                      form.priority === p
                        ? p === 'high' ? 'bg-red-500 border-red-500 text-white'
                          : p === 'medium' ? 'bg-yellow-400 border-yellow-400 text-white'
                          : 'bg-gray-400 border-gray-400 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

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
                  <option value="">Any condition</option>
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
                <label className="label">Target Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.target_price} onChange={e => set('target_price', e.target.value)} placeholder="Max you'll pay" />
              </div>
              <div>
                <label className="label">Market Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.market_price} onChange={e => set('market_price', e.target.value)} placeholder="0.00" />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="label">Image URL</label>
              <input className="input text-xs" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Looking for PSA 9 or better under $150" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><span className="spinner mr-2" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Saving…</> : item ? 'Save Changes' : 'Add to Wishlist'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
