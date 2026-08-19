import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { agentRunService } from '../../services/agentRunService';
import { getApiErrorMessage } from '../../lib/apiClient';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { AgentRunPayload, AgentType } from '../../types/agentRun';

interface AgentRunButtonProps {
  agentType: AgentType;
  label: string;
  modalTitle: string;
  buildPayload: () => AgentRunPayload;
  icon?: ReactNode;
  variant?: 'ghost' | 'solid';
  className?: string;
  onSuccess?: (summary: string) => void;
}

// Drop-in "ask the agent" button used across Item Detail (advisory), Alerts
// (procurement), report pages (analytics), and Agent Insights (monitoring).
// Every agent run this triggers is still logged server-side to AgentLog by
// the agents service itself, so nothing here needs to touch that state.
const AgentRunButton = ({
  agentType,
  label,
  modalTitle,
  buildPayload,
  icon,
  variant = 'ghost',
  className = '',
  onSuccess,
}: AgentRunButtonProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const handleClick = async () => {
    setIsRunning(true);
    setError('');
    try {
      const result = await agentRunService.run(agentType, buildPayload());
      setSummary(result.summary);
      setIsModalOpen(true);
      onSuccess?.(result.summary);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to run the agent'));
      setIsModalOpen(true);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={isRunning}
        className={`inline-flex items-center gap-1.5 ${className}`}
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : icon ?? <Sparkles className="h-4 w-4" />}
        {isRunning ? 'Running...' : label}
      </Button>

      <Modal open={isModalOpen} title={modalTitle} onClose={() => setIsModalOpen(false)}>
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{summary}</p>
        )}
      </Modal>
    </>
  );
};

export default AgentRunButton;
