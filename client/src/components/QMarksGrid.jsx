import React from 'react';

const stateBadges = {
  OK: 'text-slate-800 font-semibold',
  BLANK: 'text-slate-400 font-medium',
  UNPARSEABLE: 'text-red-600 font-bold bg-red-50 px-1 rounded',
  LOW_CONF: 'text-amber-700 font-medium bg-amber-50 px-1 rounded',
  OUT_OF_RANGE: 'text-purple-700 font-medium bg-purple-50 px-1 rounded',
  NOT_HALF_STEP: 'text-orange-700 font-medium bg-orange-50 px-1 rounded'
};

const QMarksGrid = ({ qMarks = {}, qStates = {}, compact = false }) => {
  const questions = [
    { key: 'q1', label: 'Q1', val: qMarks.q1, state: qStates.q1State },
    { key: 'q2', label: 'Q2', val: qMarks.q2, state: qStates.q2State },
    { key: 'q3', label: 'Q3', val: qMarks.q3, state: qStates.q3State },
    { key: 'q4', label: 'Q4', val: qMarks.q4, state: qStates.q4State },
    { key: 'q5', label: 'Q5', val: qMarks.q5, state: qStates.q5State }
  ];

  return (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {questions.map((q) => {
        const displayVal = q.val !== null && q.val !== undefined && q.val !== '' ? q.val : '—';
        const stateStyle = stateBadges[q.state] || (displayVal === '—' ? 'text-slate-400' : 'text-slate-800');

        return (
          <div
            key={q.key}
            className={`flex flex-col items-center justify-center border border-slate-200 rounded-lg bg-slate-50/70 ${
              compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-xs'
            }`}
            title={`${q.label}: ${displayVal} (${q.state || 'Normal'})`}
          >
            <span className="text-[10px] text-slate-600 font-medium leading-none">{q.label}</span>
            <span className={`leading-tight mt-0.5 ${stateStyle}`}>
              {displayVal}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default QMarksGrid;
