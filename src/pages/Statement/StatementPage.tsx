import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { marksService } from '../../services/marks';
import { StudentSemesterMarks } from '../../types/marks';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { ROUTES } from '../../utils/constants';

export const StatementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryUsn = searchParams.get('usn');
  const querySem = parseInt(searchParams.get('sem') || '1', 10);
  const autoPrint = searchParams.get('download') === 'true' || searchParams.get('print') === 'true';

  const [marks, setMarks] = useState<StudentSemesterMarks | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const targetUsn = (queryUsn || user?.usn || 'CS25131').trim().toUpperCase();

  useEffect(() => {
    loadStatement(targetUsn, querySem);
  }, [targetUsn, querySem]);

  useEffect(() => {
    if (!isLoading && marks && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isLoading, marks, autoPrint]);

  const loadStatement = async (usn: string, sem: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await marksService.getStudentMarks(usn, sem);
      if (res.success && res.data) {
        setMarks(res.data);
      } else {
        setMarks(null);
        setError(res.error || `Unable to load official academic statement for Semester ${sem}.`);
      }
    } catch {
      setMarks(null);
      setError('Unable to load official academic statement from records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const statusUpper = (marks?.summary.status || '').toUpperCase();
  const isPass = statusUpper === 'PASS';
  const isEnrolled = statusUpper === 'ENROLLED' || statusUpper.includes('ENROLL') || statusUpper.includes('PROGRESS');

  return (
    <div
      className="min-h-screen bg-slate-100 text-slate-900"
      style={{ colorScheme: 'light' }}
    >
      {/* Top Floating Control Bar (Hidden when printing/saving PDF) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-8 py-3 no-print shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(ROUTES.MARKS);
                }
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-xs px-2.5 sm:px-3 min-h-[36px]"
            >
              <span className="hidden xs:inline">Back</span>
            </Button>
            <div className="h-4 w-px bg-slate-200 flex-shrink-0" />
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Academic Grade Statement
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="px-3 sm:px-4 py-2 text-xs font-semibold shadow-sm min-h-[36px] touch-manipulation"
              title="Download or Print PDF Statement (Ctrl+P / Cmd+P)"
            >
              <span className="hidden xs:inline">Download PDF / Print</span>
              <span className="xs:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Statement Document Container */}
      <main className="max-w-4xl mx-auto p-3 sm:p-6 lg:p-8">
        {isLoading && (
          <div className="p-12 rounded-2xl bg-white border border-slate-200">
            <LoadingState message="Generating academic grade statement..." />
          </div>
        )}

        {!isLoading && error && (
          <div className="p-8 rounded-2xl bg-white border border-slate-200">
            <ErrorState
              title="Statement Unavailable"
              message={error}
              onRetry={() => loadStatement(targetUsn, querySem)}
            />
          </div>
        )}

        {!isLoading && marks && (
          <article
            id="printable-statement"
            className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-md p-5 sm:p-10 space-y-6 sm:space-y-8 animate-fade-in relative overflow-hidden"
          >
            {/* Top decorative security line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8048A8] via-[#F8D299] to-[#8048A8] opacity-90" />

            {/* Statement Header */}
            <div className="text-center pb-4 sm:pb-6 border-b-2 border-slate-800 space-y-1.5">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-950 uppercase leading-snug">
                Semester Grade Statement
              </h2>

              <p className="text-xs sm:text-sm font-medium text-slate-600 flex flex-wrap items-center justify-center gap-2">
                <span>Semester {marks.semester} Examination</span>
              </p>
            </div>

            {/* Student Full Profile Banner - Uncut Full Name */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-4">
              {/* Full Name Row */}
              <div className="border-b border-slate-200/80 pb-3">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  Candidate Full Name
                </span>
                <p className="text-lg sm:text-2xl font-extrabold text-slate-950 uppercase break-words leading-tight tracking-tight">
                  {marks.name}
                </p>
              </div>

              {/* Meta Grid: USN, Program, SGPA, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    University Seat No. (USN)
                  </span>
                  <p className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5">
                    {marks.usn}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Programme & Branch
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                    B.Tech • Computer Science
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Semester SGPA
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base sm:text-xl font-bold font-mono text-slate-900">
                      {marks.summary.sgpa}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">/ 10.00</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Result & Standing
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : isEnrolled ? (
                      <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span
                      className={`font-bold text-xs sm:text-sm uppercase ${
                        isPass
                          ? 'text-emerald-700'
                          : isEnrolled
                          ? 'text-sky-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {marks.summary.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Subjects & Assessments Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-600 px-1">
                <span>Course Performance Details (All {marks.subjects.length} Courses)</span>
                <span className="text-[11px] font-mono">Total Credits: {marks.summary.totalCredits}</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300 touch-pan-x">
                <table className="w-full min-w-[620px] text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                      <th className="py-2.5 px-3 font-bold w-20">Code</th>
                      <th className="py-2.5 px-3 font-bold">Course Title</th>
                      <th className="py-2.5 px-3 font-bold text-center w-20">Type</th>
                      <th className="py-2.5 px-3 font-bold text-center w-16">Credits</th>
                      <th className="py-2.5 px-3 font-bold text-right w-16">Max</th>
                      <th className="py-2.5 px-3 font-bold text-right w-16">Scored</th>
                      <th className="py-2.5 px-3 font-bold text-center w-16">Grade</th>
                      <th className="py-2.5 px-3 font-bold text-right w-20">Grade Pts</th>
                      <th className="py-2.5 px-3 font-bold text-right w-20">Credit Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {marks.subjects.map((sub, idx) => {
                      const isInc = sub.code === 'INC' || sub.code === 'INCENTIVES';
                      const effectiveGrade = isInc
                        ? (sub.grade && sub.grade !== '-' && sub.grade !== '0' && sub.grade !== 'F' ? sub.grade : 'PASS')
                        : sub.grade;
                      const isSubFail = effectiveGrade.trim().toUpperCase() === 'F';
                      return (
                        <tr key={sub.code} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                            {sub.code}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            <span>{sub.name}</span>
                            {['WFBFD', 'WFBFDL', 'DEFM', 'DEFML', 'BE', 'BA'].includes(sub.code) && (
                              <span className="ml-1.5 inline-block text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded">
                                MDM
                              </span>
                            )}
                            {['DCD', 'EST', 'EDP', 'SPS'].includes(sub.code) && (
                              <span className="ml-1.5 inline-block text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-1 rounded">
                                OE
                              </span>
                            )}
                            {sub.code === 'NPTEL' && (
                              <span className="ml-1.5 inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                NPTEL
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {sub.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                            {sub.credits || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {sub.maxTotal}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {sub.total}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                isSubFail
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-slate-100 text-slate-900 border border-slate-300/80'
                              }`}
                            >
                              {effectiveGrade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {sub.gradePoint}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {sub.creditPoints}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-800 font-bold bg-slate-100/90 text-slate-900">
                    <tr>
                      <td colSpan={4} className="py-3 px-3">
                        Total Semester Performance Summary
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {marks.summary.totalCredits}
                      </td>
                      <td colSpan={3} className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                        Total Credit Grade Points: {marks.summary.totalGradePoints || '-'}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-right font-mono text-sm">
                        SGPA: {marks.summary.sgpa}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </article>
        )}
      </main>

      {/* Scoped CSS for Crisp High-Resolution Print to PDF */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, button, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          #printable-statement {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            background: white !important;
            color: black !important;
            padding: 24px !important;
            border-radius: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #printable-statement * {
            color: black !important;
          }
          #printable-statement .bg-slate-50,
          #printable-statement .bg-slate-100 {
            background-color: #f8fafc !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StatementPage;
