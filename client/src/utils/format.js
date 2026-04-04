export const formatCurrency = (val, decimals = 2) => {
  if (val == null || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

export const formatPct = (val) => {
  if (val == null || isNaN(val)) return '—';
  const num = parseFloat(val);
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
};

export const formatDate = (val) => {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDateInput = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const profitClass = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return 'text-gray-500';
  return n >= 0 ? 'profit-positive' : 'profit-negative';
};

export const conditionBadgeClass = (condition) => {
  if (!condition) return 'badge-raw';
  if (condition.toLowerCase().startsWith('psa')) return 'badge-psa';
  return 'badge-raw';
};

export const statusBadgeClass = (status) => {
  if (status === 'sold') return 'badge-sold';
  if (status === 'active') return 'badge-active';
  return 'badge-unsold';
};
