import { useState } from 'react';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

export default function SoldForm({ listing, onSave, onClose }) {
  const [form, setForm] = useState({
    sold_price: listing?.listing_price || '',
    sold_date: new Date().toISOString().split('T')[0],
    shipping_cost: '0',
    ebay_fee_rate: listing?.ebay_fee_rate || '0.1325',
    ebay_fee_fixed: listing?.ebay_fee_fixed || '0.30',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const calc = () => {
    const sold = parseFloat(form.sold_price);
    const rate = parseFloat(form.ebay_fee_rate) || 0.1325;
    const fixed = parseFloat(form.ebay_fee_fixed) || 0.30;
    const ship = parseFloat(form.shipping_cost) || 0;
    if (!sold) return null;
    const fees = sold * rate + fixed;
    const net = sold - fees - ship;
    const purchasePrice = listing?.purchase_price ? parseFloat(listing.purchase_price) : null;
    const roi = purchasePrice ? ((net - purchasePrice) / purchasePrice * 100) : null;
    return { fees, net, roi };
  };

  const preview = calc();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sold_price) { toast.error('Sold price is required'); return; }
    setSaving(true);
    try {
      await onSave({
        sold_price: parseFloat(form.sold_price),
        sold_date: form.sold_date,
        shipping_cost: parseFloat(form.shipping_cost) || 0,
        ebay_fee_rate: parseFloat(form.ebay_fee_rate),
        ebay_fee_fixed: parseFloat(form.ebay_fee_fixed),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark as Sold</h2>
            {listing?.card_name && <p className="text-sm text-gray-500 mt-0.5">{listing.card_name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sold Price ($) *</label>
                <input className="input" type="number" step="0.01" min="0" value={form.sold_price} onChange={e => set('sold_price', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Sold Date</label>
                <input className="input" type="date" value={form.sold_date} onChange={e => set('sold_date', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Shipping Cost ($)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">eBay Fee Rate</label>
                <input className="input" type="number" step="0.001" min="0" max="1" value={form.ebay_fee_rate} onChange={e => set('ebay_fee_rate', e.target.value)} />
              </div>
              <div>
                <label className="label">Fixed Fee ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.ebay_fee_fixed} onChange={e => set('ebay_fee_fixed', e.target.value)} />
              </div>
            </div>

            {/* Profit breakdown */}
            {preview && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-200">
                <p className="font-semibold text-gray-700 mb-2">Sale Breakdown</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sale Price</span>
                  <span className="font-medium">{formatCurrency(form.sold_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">eBay Fees</span>
                  <span className="font-medium text-red-600">− {formatCurrency(preview.fees)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium text-red-600">− {formatCurrency(form.shipping_cost || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 font-bold">
                  <span>Net Profit</span>
                  <span className={preview.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(preview.net)}
                  </span>
                </div>
                {preview.roi != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">ROI vs purchase</span>
                    <span className={`font-semibold ${preview.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {preview.roi >= 0 ? '+' : ''}{preview.roi.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-success flex-1">
                {saving ? 'Saving…' : '✓ Mark Sold'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
