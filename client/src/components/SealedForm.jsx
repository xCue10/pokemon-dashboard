import { useState, useEffect } from 'react';
import { formatDateInput } from '../utils/format';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  'Booster Box',
  'Elite Trainer Box',
  'Blister Pack',
  'Tin',
  'Bundle',
  'Display Box',
  'Collection Box',
  'Premium Collection',
  'Booster Pack',
  'Other',
];

const EMPTY = {
  name: '', product_type: '', set_name: '', quantity: 1,
  purchase_price: '', purchase_date: '', market_price: '', image_url: '', notes: '',
};

export default function SealedForm({ product, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        product_type: product.product_type || '',
        set_name: product.set_name || '',
        quantity: product.quantity || 1,
        purchase_price: product.purchase_price || '',
        purchase_date: formatDateInput(product.purchase_date),
        market_price: product.market_price || '',
        image_url: product.image_url || '',
        notes: product.notes || '',
      });
    }
  }, [product]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
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
            <h2 className="text-lg font-bold text-gray-900">{product ? 'Edit Product' : 'Add Sealed Product'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {product ? 'Update product details' : 'Add a sealed product to your inventory'}
            </p>
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
              <label className="label">Product Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Prismatic Evolutions Elite Trainer Box"
                required
              />
            </div>

            {/* Type + Set */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Product Type</label>
                <select className="input" value={form.product_type} onChange={e => set('product_type', e.target.value)}>
                  <option value="">Select type</option>
                  {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Set / Series</label>
                <input className="input" value={form.set_name} onChange={e => set('set_name', e.target.value)} placeholder="e.g. Scarlet & Violet" />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Purchase Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Market Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.market_price} onChange={e => set('market_price', e.target.value)} placeholder="0.00" />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="label">Purchase Date</label>
              <input className="input" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>

            {/* Image URL */}
            <div>
              <label className="label">Image URL</label>
              <input className="input text-xs" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><span className="spinner mr-2" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Saving…</> : product ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
