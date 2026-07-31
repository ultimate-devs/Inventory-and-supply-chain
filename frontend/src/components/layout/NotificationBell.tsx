import { useEffect, useRef, useState } from 'react';
import { Bell, Check, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAlerts, fetchUnreadCount, acknowledgeAlert } from '../../store/slices/alertsSlice';
import type { AlertSeverity } from '../../types/alert';

const POLL_MS = 60 * 1000;

const SEVERITY_ICON: Record<AlertSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  critical: 'text-red-500',
};

const NotificationBell = () => {
  const dispatch = useAppDispatch();
  const { alerts, unreadCount } = useAppSelector((state) => state.alerts);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchUnreadCount());
    const interval = window.setInterval(() => dispatch(fetchUnreadCount()), POLL_MS);
    return () => window.clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    if (!open) return undefined;
    dispatch(fetchAlerts({ status: 'open', limit: 10 }));

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, dispatch]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alerts</p>
            <span className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} open</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No open alerts</p>
            )}
            {alerts.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity];
              return (
                <div
                  key={alert._id}
                  className="flex items-start gap-2.5 border-b border-slate-50 px-4 py-3 last:border-0 dark:border-slate-800/60"
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${SEVERITY_COLOR[alert.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                  {alert.status === 'open' && (
                    <button
                      onClick={() => dispatch(acknowledgeAlert(alert._id))}
                      aria-label="Acknowledge alert"
                      className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
