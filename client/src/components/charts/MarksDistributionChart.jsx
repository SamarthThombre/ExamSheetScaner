import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

const brackets = [
  { label: '0 – 10', min: 0, max: 10, color: '#f87171' },
  { label: '11 – 20', min: 11, max: 20, color: '#fbbf24' },
  { label: '21 – 30', min: 21, max: 30, color: '#60a5fa' },
  { label: '31 – 40', min: 31, max: 40, color: '#818cf8' },
  { label: '41 – 50+', min: 41, max: Infinity, color: '#34d399' }
];

const MarksDistributionChart = ({ sheets = [] }) => {
  const scores = sheets
    .map((s) => parseFloat(s.totalMarks))
    .filter((v) => !isNaN(v));

  const chartData = brackets.map((b) => {
    const count = scores.filter((score) => score >= b.min && score <= b.max).length;
    return {
      range: b.label,
      Students: count,
      color: b.color
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">Score Range Distribution</h3>
        <p className="text-xs text-slate-500">
          Spread of student total marks across score tiers
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="Students" radius={[6, 6, 0, 0]} barSize={36}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarksDistributionChart;
