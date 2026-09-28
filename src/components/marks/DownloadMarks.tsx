import React, { useState } from 'react';
import { Printer, FileText, X, CheckCircle2, XCircle, Award, Calendar, ExternalLink } from 'lucide-react';
import { StudentSemesterMarks } from '../../types/marks';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ROUTES } from '../../utils/constants';

export interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  marks: StudentSemesterMarks;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  isOpen,
  onClose,
  marks,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isPass = marks.summary.status.toUpperCase() === 'PASS';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Official Semester Grade Statement"
        maxWidth="4xl"
      >
        <div className="space-y-6 text-slate-800 dark:text-slate-100">
          {/* Printable Statement Sheet */}
          <div
            id="printable-statement"
            className="p-3.5 sm:p-8 rounded-2xl bg-white dark:bg-[#0E0E12] border border-slate-200 dark:border-[#24242C] shadow-sm space-y-4 sm:space-y-6"
          >
            {/* Institution Header */}
            <div className="text-center pb-3.5 sm:pb-5 border-b border-slate-200 dark:border-[#22222A]">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-[#16161D] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#272732] mb-2 sm:mb-3">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
                <span>Academic Session 2025–2026 • Semester {marks.semester}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase leading-snug">
                Student Academic Grade Statement
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Synchronized with Master-Sheet Examination Records
              </p>
            </div>

            {/* Student & Performance Meta Information */}
            <div className="p-3.5 sm:p-5 rounded-xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-[#222228] space-y-3 text-xs">
              {/* Candidate Full Name - Never Truncated */}
              <div className="border-b border-slate-200/80 dark:border-[#202028] pb-2.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-0.5">
                  Candidate Full Name
                </span>
                <p className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg uppercase break-words leading-tight">
                  {marks.name}
                </p>
              </div>

              {/* Meta row: USN, Program, SGPA, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    USN
                  </span>
                  <p className="font-bold font-mono text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                    {marks.usn}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Programme
                  </span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                    B.Tech CSE
                  </p>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Semester SGPA
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Award className="w-3.5 h-3.5 text-[#F8D299] flex-shrink-0" />
                    <p className="font-bold font-mono text-slate-900 dark:text-white text-xs sm:text-sm">
                      {marks.summary.sgpa} <span className="text-[10px] sm:text-xs font-normal text-slate-400">/ 10</span>
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Status
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isPass ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    )}
                    <span
                      className={`font-bold text-xs sm:text-sm uppercase ${
                        isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {marks.summary.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Swipe Notice */}
            <div className="sm:hidden flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-[#15151D] px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-[#242430]">
              <span className="flex items-center gap-1">
                <span>👉 Swipe table horizontally</span>
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{marks.subjects.length} Subjects</span>
            </div>

            {/* Complete Subjects & Assessments Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#222228] touch-pan-x">
              <table className="w-full min-w-[560px] text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-[#16161D] text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-[#222228]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-16 sticky left-0 z-20 bg-slate-100 dark:bg-[#16161D] shadow-[2px_0_5px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.4)]">
                      Code
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Course Title</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-20">Type</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-16">Credits</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-16">Max</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-16">Scored</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-16">Grade</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-20">Grade Pts</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-20">Credit Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1C1C24] bg-white dark:bg-[#0B0B0E]">
                  {marks.subjects.map((sub) => {
                    const isSubFail = sub.grade.trim().toUpperCase() === 'F';
                    return (
                      <tr key={sub.code} className="hover:bg-slate-50 dark:hover:bg-[#14141A] transition-colors">
                        <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-[#0B0B0E] shadow-[2px_0_5px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.4)]">
                          {sub.code}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                          <span>{sub.name}</span>
                          {['WFBFD', 'WFBFDL', 'DEFM', 'DEFML', 'BE', 'BA'].includes(sub.code) && (
                            <span className="ml-1.5 inline-block text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 px-1 rounded">
                              MDM
                            </span>
                          )}
                          {['DCD', 'EST', 'EDP', 'SPS'].includes(sub.code) && (
                            <span className="ml-1.5 inline-block text-[10px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 px-1 rounded">
                              OE
                            </span>
                          )}
                          {sub.code === 'NPTEL' && (
                            <span className="ml-1.5 inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-1 rounded">
                              NPTEL
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#181822] text-slate-600 dark:text-slate-400">
                            {sub.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                          {sub.credits || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {sub.maxTotal}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {sub.total}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                              isSubFail
                                ? 'bg-rose-500/10 text-rose-500'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white'
                            }`}
                          >
                            {sub.grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {sub.gradePoint}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {sub.creditPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 dark:border-[#2A2A32] font-bold bg-slate-50 dark:bg-[#14141A] text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 sticky left-0 z-10 bg-slate-50 dark:bg-[#14141A] shadow-[2px_0_5px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.4)]">
                      Total Semester Summary
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {marks.summary.totalCredits}
                    </td>
                    <td colSpan={3} className="py-3 px-3 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                      Total Credit Grade Points: {marks.summary.totalGradePoints || '-'}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right font-mono text-sm">
                      SGPA: {marks.summary.sgpa}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Authenticity & Verification Signature Row */}
            <div className="pt-3.5 sm:pt-4 border-t border-slate-200 dark:border-[#202028] flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 gap-1 text-center sm:text-left">
              <span>Verified System Statement • Extracted from Google Sheets Master Record</span>
              <span>Generated on {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Modal Action Buttons (Open in New Tab, Print and Close) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`${ROUTES.STATEMENT}?usn=${encodeURIComponent(marks.usn)}&sem=${marks.semester}`, '_blank', 'noopener,noreferrer');
              }}
              leftIcon={<ExternalLink className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />}
              className="w-full sm:w-auto justify-center py-2.5 touch-manipulation"
            >
              Open in New Tab
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto justify-center py-2.5 touch-manipulation shadow-sm"
            >
              Download PDF / Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              leftIcon={<X className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto justify-center py-2.5 touch-manipulation"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Scoped Clean Print CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, .no-print {
            display: none !important;
          }
          #printable-statement {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
};

interface DownloadMarksProps {
  marks: StudentSemesterMarks;
}

export const DownloadMarks: React.FC<DownloadMarksProps> = ({ marks }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<FileText className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />}
        className="shadow-sm"
      >
        View Statement
      </Button>

      <StatementModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        marks={marks}
      />
    </>
  );
};
