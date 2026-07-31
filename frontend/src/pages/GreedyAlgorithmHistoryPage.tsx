import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGreedyRuns, fetchGreedyRunById } from '../store/slices/algorithmsSlice';
import Table from '../components/ui/Table';
import AlgorithmNavTabs from '../components/algorithms/AlgorithmNavTabs';
import type { TableColumn } from '../components/ui/Table';
import AllocationResultPanel from '../components/algorithms/AllocationResultPanel';
import type { GreedyRun } from '../types/algorithms';

const runByName = (runBy: GreedyRun['runBy']) => (typeof runBy === 'string' ? runBy : runBy.name);

const GreedyAlgorithmHistoryPage = () => {
  const dispatch = useAppDispatch();
  const { runs, runsStatus, selectedRun } = useAppSelector((state) => state.algorithms);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchGreedyRuns({ limit: 50 }));
  }, [dispatch]);

  const handleSelect = (run: GreedyRun) => {
    setSelectedId(run._id);
    dispatch(fetchGreedyRunById(run._id));
  };

  const columns: TableColumn<GreedyRun>[] = [
    { key: 'date', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: 'runBy', header: 'Run By', render: (row) => runByName(row.runBy) },
    { key: 'budget', header: 'Budget', render: (row) => row.budget.toFixed(2) },
    { key: 'items', header: 'Items Considered', render: (row) => row.itemsConsidered.length },
    {
      key: 'greedyCovered',
      header: 'Greedy Fully Covered',
      render: (row) => row.greedyResult.itemsFullyCovered,
    },
    {
      key: 'proportionalCovered',
      header: 'Proportional Fully Covered',
      render: (row) => row.proportionalResult.itemsFullyCovered,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Greedy Algorithm History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every saved comparison run, most recent first.</p>
      </div>

      <AlgorithmNavTabs />

      <Table
        columns={columns}
        rows={runs}
        rowKey={(r) => r._id}
        isLoading={runsStatus === 'loading'}
        emptyMessage="No runs yet - try the Comparison page"
        onRowClick={handleSelect}
      />

      {selectedRun && selectedRun._id === selectedId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AllocationResultPanel title="Greedy (urgency-ranked)" result={selectedRun.greedyResult} />
          <AllocationResultPanel title="Proportional (baseline)" result={selectedRun.proportionalResult} />
        </div>
      )}
    </div>
  );
};

export default GreedyAlgorithmHistoryPage;
