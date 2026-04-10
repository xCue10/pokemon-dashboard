export default function EmptyPokeBall({ message, sub }) {
  return (
    <div className="flex flex-col items-center py-14 text-gray-400 select-none">
      <svg viewBox="0 0 100 100" width="80" height="80" className="pb-float mb-5" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="#CC0000" stroke="#333" strokeWidth="4" />
        <rect x="4" y="46" width="92" height="8" fill="#333" />
        <path d="M4 50 Q4 96 50 96 Q96 96 96 50 Z" fill="white" />
        <circle cx="50" cy="50" r="14" fill="white" stroke="#333" strokeWidth="3" />
        <circle cx="50" cy="50" r="7" fill="#CC0000" stroke="#333" strokeWidth="2" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#333" strokeWidth="4" />
      </svg>
      {message && <p className="font-medium text-gray-500">{message}</p>}
      {sub && <p className="text-sm mt-1 max-w-xs text-center">{sub}</p>}
    </div>
  );
}
