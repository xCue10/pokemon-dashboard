export default function PokeBallSpinner({ size = 44, className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`pb-spin ${className}`}
      aria-label="Loading"
    >
      <circle cx="50" cy="50" r="46" fill="#CC0000" stroke="#333" strokeWidth="4" />
      <rect x="4" y="46" width="92" height="8" fill="#333" />
      <path d="M4 50 Q4 96 50 96 Q96 96 96 50 Z" fill="white" />
      <circle cx="50" cy="50" r="14" fill="white" stroke="#333" strokeWidth="3" />
      <circle cx="50" cy="50" r="7" fill="#CC0000" stroke="#333" strokeWidth="2" className="pb-center-pulse" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#333" strokeWidth="4" />
    </svg>
  );
}
