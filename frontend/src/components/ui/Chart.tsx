import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface StockBarChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: BarSeries[];
  height?: number;
}

const StockBarChart = ({ data, categoryKey, series, height = 320 }: StockBarChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
      <XAxis dataKey={categoryKey} tick={{ fontSize: 12 }} className="fill-slate-500" />
      <YAxis tick={{ fontSize: 12 }} className="fill-slate-500" allowDecimals={false} />
      <Tooltip
        contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
        cursor={{ fill: 'rgba(99,102,241,0.06)' }}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {series.map((s) => (
        <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export default StockBarChart;
