import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const QMarksBarChart = ({ sheets = [] }) => {
  const questions = ['q1', 'q2', 'q3', 'q4', 'q5'];

  const chartData = questions.map((key, i) => {
    const scores = sheets
      .map((s) => parseFloat(s[key]))
      .filter((val) => !isNaN(val));

    const avg =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

    const max = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      question: `Question ${i + 1}`,
      Average: avg,
      Maximum: max,
      attempts: scores.length
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">Per-Question Performance</h3>
        <p className="text-xs text-slate-500">
          Average and maximum marks scored across Question 1 to Question 5
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="question"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Bar dataKey="Average" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="Maximum" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default QMarksBarChart;
