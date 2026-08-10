import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAgentLogs } from '../store/slices/agentLogsSlice';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import type { AgentLog, AgentType } from '../types/agentLog';

type Tab = 'all' | AgentType;

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Agents' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'advisory', label: 'Advisory' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'procurement', label: 'Procurement' },
];

// Only related records that already have a human review/approval surface get
// a review link - everything else is still shown, just without a dead link.
const REVIEW_ROUTE: Partial<Record<string, (id: string) => string>> = {
  PurchaseOrder: (id) => `/purchase-orders/${id}`,
  Supplier: (id) => `/suppliers/${id}`,
};

const createdByLabel = (createdBy: AgentLog['createdBy']) =>
  typeof createdBy === 'string' ? createdBy : createdBy.name;

const AgentInsightsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { logs, status, error } = useAppSelector((state) => state.agentLogs);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    dispatch(fetchAgentLogs({ limit: 50, agentType: tab === 'all' ? undefined : tab }));
  }, [dispatch, tab]);

  const columns: TableColumn<AgentLog>[] = [
    { key: 'date', header: 'When', render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      key: 'agentType',
      header: 'Agent',
      render: (row) => <Badge tone="neutral">{row.agentType}</Badge>,
    },
    { key: 'action', header: 'Action', render: (row) => row.action.replace(/_/g, ' ') },
    {
      key: 'summary',
      header: 'Insight / Recommendation',
      className: 'max-w-xl',
      render: (row) => <span className="line-clamp-3 whitespace-pre-wrap">{row.summary}</span>,
    },
    { key: 'trigger', header: 'Trigger', render: (row) => (row.triggeredBy === 'cron' ? 'Scheduled' : 'Manual') },
    { key: 'createdBy', header: 'Ran As', render: (row) => createdByLabel(row.createdBy) },
    {
      key: 'review',
      header: 'Review',
      render: (row) => {
        const buildRoute = row.relatedModel ? REVIEW_ROUTE[row.relatedModel] : undefined;
        if (!buildRoute || !row.relatedId) return <span className="text-slate-400">-</span>;
        return (
          <button
            onClick={() => navigate(buildRoute(row.relatedId as string))}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Review &amp; approve
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Agent Insights</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Latest recommendations from the ADK agents. Every entry is traceable to the record it came from - agents
            never approve a purchase order themselves, so anything actionable is a link into the normal human
            approval flow.
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Table
        columns={columns}
        rows={logs}
        rowKey={(r) => r._id}
        isLoading={status === 'loading'}
        error={error}
        emptyMessage="No agent activity recorded yet"
      />
    </div>
  );
};

export default AgentInsightsPage;
