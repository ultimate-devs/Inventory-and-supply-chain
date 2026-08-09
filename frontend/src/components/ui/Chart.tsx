import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
        cursor={{ fill: 'rgba(13,148,136,0.06)' }}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {series.map((s) => (
        <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export default StockBarChart;

interface StockLineChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: BarSeries[];
  height?: number;
}

export const StockLineChart = ({ data, categoryKey, series, height = 320 }: StockLineChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
      <XAxis dataKey={categoryKey} tick={{ fontSize: 12 }} className="fill-slate-500" />
      <YAxis tick={{ fontSize: 12 }} className="fill-slate-500" />
      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {series.map((s) => (
        <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

interface RadarSeries {
  key: string;
  label: string;
  color: string;
}

interface SupplierRadarChartProps {
  data: Array<Record<string, string | number>>;
  angleKey: string;
  series: RadarSeries[];
  height?: number;
}

export const SupplierRadarChart = ({ data, angleKey, series, height = 360 }: SupplierRadarChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadarChart data={data}>
      <PolarGrid className="stroke-slate-200 dark:stroke-slate-800" />
      <PolarAngleAxis dataKey={angleKey} tick={{ fontSize: 12 }} className="fill-slate-500" />
      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="fill-slate-400" />
      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {series.map((s) => (
        <Radar key={s.key} dataKey={s.key} name={s.label} stroke={s.color} fill={s.color} fillOpacity={0.25} />
      ))}
    </RadarChart>
  </ResponsiveContainer>
);
