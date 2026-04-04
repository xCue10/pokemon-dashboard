import { useState, useEffect } from 'react';
import { getCards } from '../utils/api';
import { formatDateInput, formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

const EMPTY = {
  card_id: '', listing_price: '', listing_date: '', status: 'active',
  listing_url: '', notes: '', ebay_fee_rate: '', ebay_fee_fixed: '',
};

export default function EbayForm({ listing, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [cards, setCards] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCards().then(setCards).catch(() => {});
  }, []);

  useEffect(() => {
    if (listing) {
      setForm({
        card_id: listing.card_id || '',
        listing_price: listing.listing_price || '',
        listing_date: formatDateInput(listing.listing_date),
        status: listing.status || 'active',
        listing_url: listing.listing_url || '',
        notes: listing.notes || '',
        ebay_fee_rate: listing.ebay_fee_rate || '',
        ebay_fee_fixed: listing.ebay_fee_fixed || '',
      });
    } else {
      setForm({ ...EMPTY, listing_date: new Date().toISOString().split('T')[0] });
    }
  }, [listing]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Preview fee calculation
  const previewFees = () => {
    const price = parseFloat(form.listing_price);
    const rate = parseFloat(form.ebay_fee_rate) || 0.1325;
    const fixed = parseFloat(form.ebay_fee_fixed) || 0.30;
    if (!price) return null;
    const fees = price * rate + fixed;
    return { fees: fees.toFixed(2), net: (price - fees).toFixed(2) };
  };

  const preview = previewFees();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.listing_price) { toast.error('Listing price is required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        card_id: form.card_id || null,
        listing_price: parseFloat(form.listing_price),
        listing_date: form.listing_date || null,
        ebay_fee_rate: form.ebay_fee_rate ? parseFloat(form.ebay_fee_rate) : undefined,
        ebay_fee_fixed: form.ebay_fee_fixed ? parseFloat(form.ebay_fee_fixed) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCard = cards.find(c => String(c.id) === String(form.card_id));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{listing ? 'Edit Listing' : 'New eBay Listing'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track a card listed for sale on eBay</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Link */}
            <div>
              <label className="label">Linked Card (optional)</label>
              <select className="input" value={form.card_id} onChange={e => set('card_id', e.target.value)}>
                <option value="">— No linked card —</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.set_name ? `— ${c.set_name}` : ''} {c.condition ? `(${c.condition})` : ''}
                  </option>
                ))}
              </select>
              {selectedCard?.image_url && (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <img src={selectedCard.image_url} alt={selectedCard.name} className="h-16 object-contain" />
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold">{selectedCard.name}</p>
                    <p>{selectedCard.set_name}</p>
                    {selectedCard.market_price && <p className="text-pokemon-red font-semibold">Market: {formatCurrency(selectedCard.market_price)}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Price + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Listing Price ($) *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.listing_price}
                  onChange={e => set('listing_price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="label">Listing Date</label>
                <input className="input" type="date" value={form.listing_date} onChange={e => set('listing_date', e.target.value)} />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="unsold">Unsold / Ended</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* eBay Fee Preview */}
            {preview && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                <p className="font-semibold text-yellow-800 mb-1">Fee Estimate</p>
                <p className="text-yellow-700">
                  eBay fees: <span className="font-semibold">{formatCurrency(preview.fees)}</span> &nbsp;|&nbsp;
                  Net after fees: <span className="font-semibold text-green-700">{formatCurrency(preview.net)}</span>
                </p>
              </div>
            )}

            {/* Fee Override */}
            <details className="text-sm">
              <summary className="text-gray-500 cursor-pointer select-none hover:text-gray-700">
                Override eBay Fee Settings
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Fee Rate (e.g. 0.1325)</label>
                  <input className="input" type="number" step="0.001" min="0" max="1" value={form.ebay_fee_rate} onChange={e => set('ebay_fee_rate', e.target.value)} placeholder="0.1325 (13.25%)" />
                </div>
                <div>
                  <label className="label">Fixed Fee ($)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.ebay_fee_fixed} onChange={e => set('ebay_fee_fixed', e.target.value)} placeholder="0.30" />
                </div>
              </div>
            </details>

            {/* Listing URL */}
            <div>
              <label className="label">eBay Listing URL</label>
              <input className="input" type="url" value={form.listing_url} onChange={e => set('listing_url', e.target.value)} placeholder="https://www.ebay.com/itm/…" />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : listing ? 'Save Changes' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
