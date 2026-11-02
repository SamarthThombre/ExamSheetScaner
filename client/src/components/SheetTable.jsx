import React, { useState } from 'react';
import api from '../api/axios';
import StatusChip from './StatusChip';
import QMarksGrid from './QMarksGrid';
import SheetDetailModal from './SheetDetailModal';
import { Edit3, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, FileSpreadsheet, Trash2, Search, X } from 'lucide-react';

const filterTabs = [
  { id: '', label: 'All' },
  { id: 'OK', label: 'Verified' },
  { id: 'CHECK', label: 'Needs Review' },
  { id: 'RESCAN', label: 'Rescan' },
  { id: 'ERROR', label: 'Error' }
];

const SheetTable = ({
  sheets = [],
  batchId,
  loading = false,
  total = 0,
  page = 1,
  pages = 1,
  activeFilter = '',
  searchTerm = '',
  onFilterChange,
  onSearchChange,
  onPageChange,
  onSheetUpdated,
  onSheetDeleted
}) => {
  const [selectedSheet, setSelectedSheet] = useState(null);

  const currentIndex = selectedSheet ? sheets.findIndex((s) => s._id === selectedSheet._id) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < sheets.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNextSheet = () => {
    if (hasNext) {
      setSelectedSheet(sheets[currentIndex + 1]);
    }
  };

  const handlePrevSheet = () => {
    if (hasPrev) {
      setSelectedSheet(sheets[currentIndex - 1]);
    }
  };

  const handleSheetSaved = (updatedSheet, andNext = false) => {
    if (onSheetUpdated) {
      onSheetUpdated(updatedSheet);
    }
    if (andNext) {
      const idx = sheets.findIndex((s) => s._id === updatedSheet._id);
      if (idx >= 0 && idx < sheets.length - 1) {
        setSelectedSheet(sheets[idx + 1]);
      } else {
        setSelectedSheet(null);
      }
    } else {
      setSelectedSheet(null);
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!window.confirm('Are you sure you want to delete this sheet?')) return;
    try {
      const res = await api.delete(`/batches/${batchId}/sheets/${sheetId}`);
      if (res.data?.success) {
        if (onSheetDeleted) onSheetDeleted(sheetId);
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Filter Tabs */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Search by Enrollment Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search by enrollment no..."
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-52 sm:w-60 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange && onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Showing <span className="font-bold text-slate-800">{sheets.length}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> sheets
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Enrolment</th>
              <th className="py-3 px-4">Q1 – Q5 Breakdown</th>
              <th className="py-3 px-4 text-center">Total</th>
              <th className="py-3 px-4 text-center">Sum Check</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400">
                  Loading answer sheets...
                </td>
              </tr>
            ) : sheets.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No answer sheets found</p>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                    {searchTerm ? (
                      <>
                        No answer sheets match enrollment number &ldquo;<strong>{searchTerm}</strong>&rdquo;.
                      </>
                    ) : activeFilter ? (
                      'No sheets match the selected filter.'
                    ) : (
                      'Upload some answer sheet scans above to get started.'
                    )}
                  </p>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => onSearchChange && onSearchChange('')}
                      className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      Clear Search
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sheets.map((sheet) => {
                const confPct = Math.round((sheet.enrolmentConf || 0) * 100);

                return (
                  <tr
                    key={sheet._id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => setSelectedSheet(sheet)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-400 text-center">
                      {sheet.orderIndex}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      <div>{sheet.enrolment || <span className="text-slate-400 italic font-sans font-normal">Unread</span>}</div>
                      {sheet.enrolment && (
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          {confPct}% conf
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <QMarksGrid
                        compact
                        qMarks={{
                          q1: sheet.q1,
                          q2: sheet.q2,
                          q3: sheet.q3,
                          q4: sheet.q4,
                          q5: sheet.q5
                        }}
                        qStates={{
                          q1State: sheet.q1State,
                          q2State: sheet.q2State,
                          q3State: sheet.q3State,
                          q4State: sheet.q4State,
                          q5State: sheet.q5State
                        }}
                      />
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-900 text-sm">
                      {sheet.totalMarks != null ? sheet.totalMarks : '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          sheet.sumCheck === 'AGREE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sheet.sumCheck === 'MISMATCH'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sheet.sumCheck || 'N/A'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StatusChip status={sheet.statusLabel} size="xs" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSheet(sheet);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSheet(sheet._id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition"
                          title="Delete Sheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pages > 1 && (
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Page <span className="font-bold text-slate-700">{page}</span> of{' '}
            <span className="font-bold text-slate-700">{pages}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Review & Edit Modal */}
      <SheetDetailModal
        sheet={selectedSheet}
        batchId={batchId}
        isOpen={!!selectedSheet}
        onClose={() => setSelectedSheet(null)}
        onSheetUpdated={handleSheetSaved}
        onSheetDeleted={(deletedId) => {
          setSelectedSheet(null);
          if (onSheetDeleted) onSheetDeleted(deletedId);
        }}
        onNextSheet={handleNextSheet}
        onPrevSheet={handlePrevSheet}
        hasNext={hasNext}
        hasPrev={hasPrev}
        currentIndex={currentIndex}
        totalCount={sheets.length}
      />
    </div>
  );
};

export default SheetTable;
