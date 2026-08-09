import { useEffect, useState } from 'react';
import { AlertCircle, GitCompare } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCandidates, runComparison } from '../store/slices/algorithmsSlice';
import AllocationResultPanel from '../components/algorithms/AllocationResultPanel';
import AlgorithmNavTabs from '../components/algorithms/AlgorithmNavTabs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const DELTA_LABELS: Record<string, string> = {
  totalAllocated: 'Allocated',
  unallocatedBudget: 'Unallocated',
  itemsFullyCovered: 'Fully Covered',
  itemsPartiallyCovered: 'Partially Covered',
  itemsUncovered: 'Uncovered',
  weightedUrgencyServed: 'Urgency Served',
};

const AlgorithmComparisonPage = () => {
  const dispatch = useAppDispatch();
  const { candidates, candidatesStatus, comparison, comparisonStatus, comparisonError } = useAppSelector(
    (state) => state.algorithms,
  );
  const [budget, setBudget] = useState('1000');

  useEffect(() => {
    dispatch(fetchCandidates());
  }, [dispatch]);

  const handleRun = () => {
    dispatch(runComparison({ budget: Number(budget) || 0 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Greedy vs Proportional</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Compare the urgency-ranked allocator against the proportional baseline, side by side.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="w-48">
          <Input id="budget" label="Budget" icon={null} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <Button onClick={handleRun} disabled={comparisonStatus === 'loading'} className="inline-flex items-center gap-1.5">
          <GitCompare className="h-4 w-4" />
          {comparisonStatus === 'loading' ? 'Comparing...' : 'Run Comparison'}
        </Button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {candidatesStatus === 'succeeded' ? `${candidates.length} low-stock item(s) eligible` : 'Loading candidates...'}
        </p>
      </div>

      <AlgorithmNavTabs />

      {comparisonError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{comparisonError}</span>
        </div>
      )}

      {comparison && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AllocationResultPanel title="Greedy (urgency-ranked)" result={comparison.run.greedyResult} />
            <AllocationResultPanel title="Proportional (baseline)" result={comparison.run.proportionalResult} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Difference (Greedy - Proportional)
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {Object.entries(comparison.deltas).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {DELTA_LABELS[key] ?? key}
                  </p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      value > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : value < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {value > 0 ? '+' : ''}
                    {Math.abs(value) < 10 ? value.toFixed(2) : Math.round(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlgorithmComparisonPage;
