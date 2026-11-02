import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

const TrendLineChart = ({ sheets = [], averageMarks = 0 }) => {
  // Sort sheets sequentially by orderIndex
  const sortedSheets = [...sheets].sort((a, b) => a.orderIndex - b.orderIndex);

  const chartData = sortedSheets.map((s) => ({
    label: `#${s.orderIndex}`,
    enrolment: s.enrolment || 'N/A',
    score: parseFloat(s.totalMarks) || 0,
    status: s.statusLabel
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">Score Sequence Trend</h3>
        <p className="text-xs text-slate-500">
          Student total marks evaluated sequentially with batch average reference
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
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
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs">
                      <div className="font-bold text-slate-900 mb-1">
                        Sheet {data.label} ({data.enrolment})
                      </div>
                      <div className="text-indigo-600 font-semibold">
                        Total Marks: {data.score}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Status: {data.status}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {averageMarks > 0 && (
              <ReferenceLine
                y={averageMarks}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Avg: ${averageMarks}`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopLeft'
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#4f46e5', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: '#6366f1' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendLineChart;
