import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

const PassFailPieChart = ({ sheets = [], passingThreshold = 20 }) => {
  const validScores = sheets
    .map((s) => parseFloat(s.totalMarks))
    .filter((v) => !isNaN(v));

  const passCount = validScores.filter((s) => s >= passingThreshold).length;
  const failCount = validScores.filter((s) => s < passingThreshold).length;
  const total = passCount + failCount;

  const data = [
    { name: 'Passing', value: passCount, color: '#10b981' },
    { name: 'Needs Improvement / Fail', value: failCount, color: '#ef4444' }
  ];

  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div className="mb-2">
        <h3 className="text-base font-bold text-slate-900">Pass / Fail Ratio</h3>
        <p className="text-xs text-slate-500">
          Threshold: &ge; {passingThreshold} marks ({passRate}% pass rate)
        </p>
      </div>

      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-7">
          <span className="text-2xl font-black text-slate-900">{passRate}%</span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Pass Rate</span>
        </div>
      </div>
    </div>
  );
};

export default PassFailPieChart;
