export default function StatCard({ title, value, subtitle, icon, color = 'red', trend }) {
  const colorMap = {
    red: 'bg-red-50 text-pokemon-red border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    blue: 'bg-blue-50 text-pokemon-blue border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const iconBg = {
    red: 'bg-pokemon-red',
    green: 'bg-green-600',
    blue: 'bg-pokemon-blue',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500',
  };

  return (
    <div className={`card border ${colorMap[color] || colorMap.red} flex items-start gap-4 relative overflow-hidden`}>
      <div className="shimmer-once absolute inset-0 pointer-events-none" aria-hidden="true" />
      {icon && (
        <div className={`${iconBg[color] || iconBg.red} text-white w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</p>
        <p className="text-2xl font-bold leading-none mb-1">{value}</p>
        {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
        {trend != null && (
          <p className={`text-xs font-semibold mt-1 ${parseFloat(trend) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {parseFloat(trend) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(trend)).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}
