import React from 'react';
import { Link } from 'react-router-dom';
import StatusChip from './StatusChip';
import { BookOpen, Layers, CheckCircle2, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';

const BatchCard = ({ batch, onDelete }) => {
  const {
    _id,
    examName,
    subjectCode,
    status,
    totalSheets = 0,
    okCount = 0,
    checkCount = 0,
    rescanCount = 0,
    reviewRate = 0,
    createdAt
  } = batch;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
                {subjectCode}
              </span>
              <StatusChip status={status} size="xs" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{examName}</h3>
          </div>

          {onDelete && (
            <button
              onClick={() => onDelete(_id, examName)}
              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
              title="Delete batch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 my-2 border-y border-slate-100 text-center">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Sheets
            </span>
            <span className="text-base font-bold text-slate-800">{totalSheets}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Verified
            </span>
            <span className="text-base font-bold text-emerald-600">{okCount}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
              Needs Review
            </span>
            <span className="text-base font-bold text-amber-600">
              {checkCount + rescanCount}
            </span>
          </div>
        </div>

        {/* Review rate progress */}
        {totalSheets > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-500">Flagged Rate</span>
              <span className="font-semibold text-slate-700">{reviewRate}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  reviewRate > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(reviewRate, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">{formattedDate}</span>
        <Link
          to={`/batches/${_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          <span>View Batch</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default BatchCard;
