import type { AllocationResult } from '../../types/algorithms';

interface AllocationResultPanelProps {
  title: string;
  result: AllocationResult;
}

const SUMMARY_TILES: Array<{ key: keyof AllocationResult; label: string; format?: (v: number) => string }> = [
  { key: 'totalAllocated', label: 'Allocated', format: (v) => v.toFixed(2) },
  { key: 'unallocatedBudget', label: 'Unallocated', format: (v) => v.toFixed(2) },
  { key: 'itemsFullyCovered', label: 'Fully Covered' },
  { key: 'itemsPartiallyCovered', label: 'Partially Covered' },
  { key: 'itemsUncovered', label: 'Uncovered' },
  { key: 'weightedUrgencyServed', label: 'Urgency Served', format: (v) => v.toFixed(1) },
];

const AllocationResultPanel = ({ title, result }: AllocationResultPanelProps) => (
  <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>

    <div className="grid grid-cols-3 gap-3">
      {SUMMARY_TILES.map(({ key, label, format }) => (
        <div key={key} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {format ? format(result[key] as number) : String(result[key])}
          </p>
        </div>
      ))}
    </div>

    <div className="space-y-3">
      {result.allocations.length === 0 && <p className="text-sm text-slate-400">No items considered.</p>}
      {result.allocations.map((a) => (
        <div key={a.item}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">{a.name}</span>
            <span className="text-slate-500 dark:text-slate-400">
              urgency {Math.round(a.urgencyScore)} · {a.allocatedAmount.toFixed(2)} ({Math.round(a.fractionCovered * 100)}
              %)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.round(a.fractionCovered * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AllocationResultPanel;
