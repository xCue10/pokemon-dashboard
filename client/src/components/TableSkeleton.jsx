// Deterministic shimmer widths so React doesn't recalculate on each render
const WIDTHS = [
  [80, 60, 50, 40, 55, 45, 50, 60, 55, 45, 50, 40],
  [65, 75, 45, 55, 40, 60, 45, 50, 65, 55, 45, 60],
  [90, 50, 60, 45, 65, 50, 55, 40, 70, 50, 60, 50],
  [70, 65, 55, 50, 45, 65, 50, 55, 60, 45, 55, 65],
  [75, 55, 70, 60, 55, 45, 60, 65, 50, 60, 45, 55],
];

export default function TableSkeleton({ cols = 6, rows = 5 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i} className="border-b border-gray-50">
      {Array.from({ length: cols }, (_, j) => (
        <td key={j} className="table-td">
          <div
            className="h-3.5 bg-gray-100 rounded-full animate-pulse"
            style={{ width: `${WIDTHS[i % WIDTHS.length][j % 12]}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}
