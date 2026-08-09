import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { getApiErrorMessage } from '../lib/apiClient';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { SystemSettings } from '../types/admin';

const SystemSettingsPage = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    settingsService
      .get()
      .then(setSettings)
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load settings')))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveMessage('');
    setError(null);
    try {
      const updated = await settingsService.update({
        companyName: settings.companyName,
        currency: settings.currency,
        defaultBudget: settings.defaultBudget,
        lowStockThresholdPercent: settings.lowStockThresholdPercent,
        criticalStockThresholdPercent: settings.criticalStockThresholdPercent,
        excessStockMultiplier: settings.excessStockMultiplier,
        defaultServiceLevel: settings.defaultServiceLevel,
      });
      setSettings(updated);
      setSaveMessage('Settings saved');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to save settings'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-red-500">{error || 'Unable to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Company defaults and stock-status thresholds used across the platform.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saveMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="companyName" label="Company Name" icon={null} value={settings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
          <Input id="currency" label="Currency" icon={null} value={settings.currency} onChange={(e) => handleChange('currency', e.target.value.toUpperCase())} maxLength={3} />
          <Input
            id="defaultBudget"
            label="Default Budget"
            icon={null}
            type="number"
            value={settings.defaultBudget}
            onChange={(e) => handleChange('defaultBudget', Number(e.target.value))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Default Service Level</label>
            <select
              value={settings.defaultServiceLevel}
              onChange={(e) => handleChange('defaultServiceLevel', Number(e.target.value) as 90 | 95 | 99)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value={90}>90%</option>
              <option value={95}>95%</option>
              <option value={99}>99%</option>
            </select>
          </div>
          <Input
            id="lowStockThresholdPercent"
            label="Low Stock Threshold %"
            icon={null}
            type="number"
            value={settings.lowStockThresholdPercent}
            onChange={(e) => handleChange('lowStockThresholdPercent', Number(e.target.value))}
          />
          <Input
            id="criticalStockThresholdPercent"
            label="Critical Stock Threshold %"
            icon={null}
            type="number"
            value={settings.criticalStockThresholdPercent}
            onChange={(e) => handleChange('criticalStockThresholdPercent', Number(e.target.value))}
          />
          <Input
            id="excessStockMultiplier"
            label="Excess Stock Multiplier"
            icon={null}
            type="number"
            step="0.1"
            value={settings.excessStockMultiplier}
            onChange={(e) => handleChange('excessStockMultiplier', Number(e.target.value))}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettingsPage;
