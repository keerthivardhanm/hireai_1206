import type { FunnelData, ScoreDistribution, TrendData, DepartmentData, SkillGap } from '../../types';

// Funnel Chart
interface FunnelChartProps {
  data: FunnelData[];
  height?: number;
}

export function FunnelChart({ data, height = 300 }: FunnelChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const colors = [
    'bg-blue-500',
    'bg-cyan-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-emerald-500',
    'bg-red-400'
  ];

  return (
    <div className="space-y-3" style={{ minHeight: height }}>
      {data.map((item, idx) => (
        <div key={item.stage} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">{item.stage}</span>
            <span className="text-gray-500">{item.count} ({item.percentage}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-8 relative overflow-hidden">
            <div
              className={`h-full ${colors[idx]} rounded-full transition-all duration-500`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-white drop-shadow-sm">
                {item.count}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Bar Chart (Horizontal)
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
}

export function BarChart({ data, showValues = true }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700 truncate max-w-[60%]">{item.label}</span>
            {showValues && <span className="text-gray-500">{item.value}</span>}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-full ${item.color || 'bg-emerald-500'} rounded-full transition-all`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Score Distribution
interface ScoreDistChartProps {
  data: ScoreDistribution[];
}

export function ScoreDistChart({ data }: ScoreDistChartProps) {
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-emerald-400'];

  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((item, idx) => (
        <div key={item.range} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-100 rounded-t-lg h-28 relative">
            <div
              className={`absolute bottom-0 left-0 right-0 ${colors[idx]} rounded-t-lg transition-all`}
              style={{ height: `${Math.max(item.percentage, 5)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600">{item.range}</span>
          <span className="text-xs text-gray-500">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

// Line Chart
interface LineChartProps {
  data: TrendData[];
  height?: number;
}

export function LineChart({ data, height = 200 }: LineChartProps) {
  const maxApplications = Math.max(...data.map(d => d.applications), 1);
  const maxHired = Math.max(...data.map(d => d.hired), 1);
  const maxValue = Math.max(maxApplications, maxHired);
  const chartHeight = height - 40;

  const getArea = (field: 'applications' | 'hired', maxVal: number) => {
    if (!data.length) return '';
    const stepX = 100 / (data.length - 1 || 1);
    let path = `M 0 ${chartHeight}`;
    data.forEach((d, i) => {
      const x = i * stepX;
      const y = chartHeight - (d[field] / maxVal) * chartHeight * 0.9;
      path += ` L ${x} ${y}`;
    });
    return path;
  };

  return (
    <div className="relative" style={{ height }}>
      {/* Legend */}
      <div className="flex gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Applications</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-600">Hired</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight + 20 }}>
        <svg viewBox={`0 0 100 ${chartHeight + 20}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={chartHeight * (1 - y/100)} x2="100" y2={chartHeight * (1 - y/100)} stroke="#f0f0f0" strokeWidth="0.2" />
          ))}

          {/* Applications area */}
          <path
            d={getArea('applications', maxValue) + ` L 100 ${chartHeight} Z`}
            fill="rgba(59, 130, 246, 0.1)"
          />

          {/* Applications line */}
          <path
            d={getArea('applications', maxValue)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Hired area */}
          <path
            d={getArea('hired', maxValue) + ` L 100 ${chartHeight} Z`}
            fill="rgba(16, 185, 129, 0.1)"
          />

          {/* Hired line */}
          <path
            d={getArea('hired', maxValue)}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

// Heatmap
interface HeatmapProps {
  data: SkillGap[];
  height?: number;
}

export function Heatmap({ data, height = 200 }: HeatmapProps) {
  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-400" /> Skill Gap
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-200" /> Balanced
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-400" /> Surplus
        </span>
      </div>

      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-24 truncate">{item.skill}</span>
          <div className="flex-1 h-6 relative">
            <div className="absolute inset-y-0 left-0 w-1/2 flex justify-end bg-gray-50 rounded-l">
              <div
                className="h-full rounded-l transition-all"
                style={{
                  width: `${(item.demand / Math.max(item.demand, item.supply, 1)) * 100}%`,
                  backgroundColor: '#3b82f6'
                }}
              />
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 flex justify-start bg-gray-50 rounded-r">
              <div
                className="h-full rounded-r transition-all"
                style={{
                  width: `${(item.supply / Math.max(item.demand, item.supply, 1)) * 100}%`,
                  backgroundColor: '#10b981'
                }}
              />
            </div>
            <div
              className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 -translate-x-1/2"
            />
          </div>
          <span className={`text-sm font-medium w-12 text-right ${item.gap > 0 ? 'text-red-600' : item.gap < 0 ? 'text-green-600' : 'text-gray-500'}`}>
            {item.gap > 0 ? '+' : ''}{item.gap}
          </span>
        </div>
      ))}
    </div>
  );
}

// Department Summary
interface DeptChartProps {
  data: DepartmentData[];
}

export function DeptChart({ data }: DeptChartProps) {
  const maxJobs = Math.max(...data.map(d => d.jobs), 1);
  const maxApps = Math.max(...data.map(d => d.applications), 1);
  const maxHired = Math.max(...data.map(d => d.hired), 1);

  return (
    <div className="space-y-3">
      {data.map((dept) => (
        <div key={dept.department} className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">{dept.department}</span>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{dept.jobs} jobs</span>
              <span>{dept.applications} apps</span>
              <span className="text-emerald-600">{dept.hired} hired</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
            <div className="bg-blue-400 h-full" style={{ width: `${(dept.jobs / maxJobs) * 33}%` }} />
            <div className="bg-purple-400 h-full" style={{ width: `${(dept.applications / maxApps) * 33}%` }} />
            <div className="bg-emerald-400 h-full" style={{ width: `${(dept.hired / maxHired) * 33}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Donut Chart
interface DonutChartProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DonutChart({ value, max, label, color = '#10b981', size = 'md' }: DonutChartProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const sizes = {
    sm: { width: 80, stroke: 8 },
    md: { width: 120, stroke: 12 },
    lg: { width: 160, stroke: 16 }
  };
  const { width, stroke } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height: width }}>
        <svg viewBox={`0 0 ${width} ${width}`} className="w-full h-full -rotate-90">
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-600 mt-2">{label}</span>
    </div>
  );
}
