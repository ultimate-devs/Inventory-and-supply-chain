import { useEffect, useState } from 'react';
import { AlertCircle, Play } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCandidates, runGreedyAllocation } from '../store/slices/algorithmsSlice';
import AllocationResultPanel from '../components/algorithms/AllocationResultPanel';
import AlgorithmNavTabs from '../components/algorithms/AlgorithmNavTabs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const GreedyAlgorithmRunPage = () => {
  const dispatch = useAppDispatch();
  const { candidates, candidatesStatus, greedyResult, greedyStatus, greedyError } = useAppSelector(
    (state) => state.algorithms,
  );
  const [budget, setBudget] = useState('1000');

  useEffect(() => {
    dispatch(fetchCandidates());
  }, [dispatch]);

  const handleRun = () => {
    dispatch(runGreedyAllocation({ budget: Number(budget) || 0 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Greedy Budget Allocation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Urgency-ranked allocation across real low-stock/critical items.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="w-48">
          <Input id="budget" label="Budget" icon={null} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <Button onClick={handleRun} disabled={greedyStatus === 'loading'} className="inline-flex items-center gap-1.5">
          <Play className="h-4 w-4" />
          {greedyStatus === 'loading' ? 'Running...' : 'Run Allocation'}
        </Button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {candidatesStatus === 'succeeded' ? `${candidates.length} low-stock item(s) eligible` : 'Loading candidates...'}
        </p>
      </div>

      <AlgorithmNavTabs />

      {greedyError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{greedyError}</span>
        </div>
      )}

      {greedyResult && <AllocationResultPanel title="Greedy Allocation Result" result={greedyResult.result} />}
    </div>
  );
};

export default GreedyAlgorithmRunPage;
