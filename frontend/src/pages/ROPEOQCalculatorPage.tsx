import { useMemo, useState } from 'react';
import Input from '../components/ui/Input';
import {
  calculateROPSimple,
  calculateROPProbabilistic,
  calculateEOQ,
  SENSITIVITY_MULTIPLIERS,
} from '../lib/ropEoq';

const SERVICE_LEVELS = [90, 95, 99] as const;

// Sequential single-hue ramp (light -> dark), matching the app's primary
// scale, for the EOQ sensitivity heatmap. Index 0 = lowest EOQ in the grid,
// index 8 = highest - never a rainbow, always one hue.
const HEAT_STEPS = [
  'bg-primary-50 text-slate-900',
  'bg-primary-100 text-slate-900',
  'bg-primary-200 text-slate-900',
  'bg-primary-300 text-slate-900',
  'bg-primary-400 text-slate-900',
  'bg-primary-500 text-white',
  'bg-primary-600 text-white',
  'bg-primary-700 text-white',
  'bg-primary-800 text-white',
];

const ResultTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{Math.round(value * 100) / 100}</p>
  </div>
);

const ROPEOQCalculatorPage = () => {
  const [avgDailyDemand, setAvgDailyDemand] = useState(20);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [demandStdDev, setDemandStdDev] = useState(4);
  const [safetyStock, setSafetyStock] = useState(15);
  const [serviceLevel, setServiceLevel] = useState<90 | 95 | 99>(95);
  const [orderingCost, setOrderingCost] = useState(50);
  const [holdingCostPerUnit, setHoldingCostPerUnit] = useState(2);

  const ropSimple = useMemo(
    () => calculateROPSimple({ avgDailyDemand, leadTimeDays, safetyStock }),
    [avgDailyDemand, leadTimeDays, safetyStock],
  );
  const ropProbabilistic = useMemo(
    () => calculateROPProbabilistic({ avgDailyDemand, leadTimeDays, demandStdDev, serviceLevel }),
    [avgDailyDemand, leadTimeDays, demandStdDev, serviceLevel],
  );
  const annualDemand = avgDailyDemand * 365;
  const eoq = useMemo(
    () => calculateEOQ({ annualDemand, orderingCost, holdingCostPerUnit }),
    [annualDemand, orderingCost, holdingCostPerUnit],
  );

  const sensitivity = useMemo(() => {
    const grid = SENSITIVITY_MULTIPLIERS.map((rowMultiplier) =>
      SENSITIVITY_MULTIPLIERS.map((colMultiplier) =>
        calculateEOQ({
          annualDemand,
          orderingCost: orderingCost * rowMultiplier,
          holdingCostPerUnit: holdingCostPerUnit * colMultiplier,
        }),
      ),
    );
    const flat = grid.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    return { grid, min, max };
  }, [annualDemand, orderingCost, holdingCostPerUnit]);

  const heatClass = (value: number) => {
    if (sensitivity.max === sensitivity.min) return HEAT_STEPS[4];
    const ratio = (value - sensitivity.min) / (sensitivity.max - sensitivity.min);
    const idx = Math.round(ratio * (HEAT_STEPS.length - 1));
    return HEAT_STEPS[idx];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">ROP &amp; EOQ Calculator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Live what-if calculator - adjust any input and every result recalculates instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inputs</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input id="avgDailyDemand" label="Avg Daily Demand" icon={null} type="number" value={avgDailyDemand} onChange={(e) => setAvgDailyDemand(Number(e.target.value) || 0)} />
            <Input id="leadTimeDays" label="Lead Time (days)" icon={null} type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(Number(e.target.value) || 0)} />
            <Input id="demandStdDev" label="Demand Std Dev" icon={null} type="number" value={demandStdDev} onChange={(e) => setDemandStdDev(Number(e.target.value) || 0)} />
            <Input id="safetyStock" label="Safety Stock" icon={null} type="number" value={safetyStock} onChange={(e) => setSafetyStock(Number(e.target.value) || 0)} />
            <Input id="orderingCost" label="Ordering Cost" icon={null} type="number" step="0.01" value={orderingCost} onChange={(e) => setOrderingCost(Number(e.target.value) || 0)} />
            <Input id="holdingCostPerUnit" label="Holding Cost / Unit" icon={null} type="number" step="0.01" value={holdingCostPerUnit} onChange={(e) => setHoldingCostPerUnit(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Service Level</label>
            <div className="flex gap-2">
              {SERVICE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setServiceLevel(level)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    serviceLevel === level
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {level}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Results</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ResultTile label="ROP (Simple)" value={ropSimple} />
            <ResultTile label="ROP (Probabilistic)" value={ropProbabilistic} />
            <ResultTile label="EOQ" value={eoq} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Annual demand used for EOQ: {Math.round(annualDemand)} units/year.</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            EOQ Sensitivity (Ordering Cost x Holding Cost)
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Lower EOQ</span>
            <div className="flex h-3 w-28 overflow-hidden rounded-full">
              {HEAT_STEPS.map((cls) => (
                <span key={cls} className={`h-full flex-1 ${cls.split(' ')[0]}`} />
              ))}
            </div>
            <span>Higher EOQ</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-max border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="p-2 text-right font-medium text-slate-500 dark:text-slate-400">
                  Ordering \ Holding
                </th>
                {SENSITIVITY_MULTIPLIERS.map((colMultiplier, colIdx) => (
                  <th key={colIdx} className="p-2 text-center font-medium text-slate-500 dark:text-slate-400">
                    {(holdingCostPerUnit * colMultiplier).toFixed(2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.grid.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <th className="p-2 text-right font-medium text-slate-500 dark:text-slate-400">
                    {(orderingCost * SENSITIVITY_MULTIPLIERS[rowIdx]).toFixed(2)}
                  </th>
                  {row.map((value, colIdx) => (
                    <td
                      key={colIdx}
                      title={`Ordering cost ${(orderingCost * SENSITIVITY_MULTIPLIERS[rowIdx]).toFixed(2)}, holding cost ${(holdingCostPerUnit * SENSITIVITY_MULTIPLIERS[colIdx]).toFixed(2)} -> EOQ ${Math.round(value)}`}
                      className={`rounded-md p-2 text-center font-medium ${heatClass(value)} ${
                        rowIdx === 3 && colIdx === 3 ? 'ring-2 ring-slate-900 dark:ring-white' : ''
                      }`}
                    >
                      {Math.round(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Highlighted cell is the current ordering/holding cost combination. Rows/columns vary each parameter from 0.5x
          to 1.5x.
        </p>
      </div>
    </div>
  );
};

export default ROPEOQCalculatorPage;
