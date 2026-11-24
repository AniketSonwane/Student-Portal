import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Search,
  X,
  Download,
  Eye,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  File,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { SemesterSelector } from '../../components/marks/SemesterSelector';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { LoadingState } from '../../components/common/LoadingState';
import {
  semesterDataService,
  SemesterDriveFile,
  SemesterFileType,
} from '../../services/semesterData';
import { FilePreviewModal } from '../../components/semesterData/FilePreviewModal';
import { ROUTES } from '../../utils/constants';

export const SemesterDataPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Selected Semester (defaults to student's current semester or 3)
  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    return user?.current_semester || 3;
  });

  // State
  const [files, setFiles] = useState<SemesterDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<SemesterDriveFile | null>(null);

  // Load files for selected semester
  const loadFiles = async (semester: number, forceRefresh: boolean = false) => {
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await semesterDataService.fetchSemesterFiles(semester, forceRefresh);
      setFiles(res.files || []);
    } catch (err) {
      console.warn('Failed to load semester files:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFiles(selectedSemester, false);
  }, [selectedSemester]);

  // Filtered files list based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase().trim();
    return files.filter((f) => {
      const matchesTopic = f.topic.toLowerCase().includes(q);
      const matchesSub = f.subject.toLowerCase().includes(q);
      const matchesName = f.name.toLowerCase().includes(q);
      const matchesExt = f.extension.toLowerCase().includes(q);
      const matchesType = f.fileType.toLowerCase().includes(q);
      return matchesTopic || matchesSub || matchesName || matchesExt || matchesType;
    });
  }, [files, searchQuery]);

  // Helpers for file badges and icons
  const getFileIcon = (type: SemesterFileType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-500" />;
      case 'ppt':
        return <Presentation className="w-4 h-4 text-amber-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-blue-500" />;
      case 'doc':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      default:
        return <File className="w-4 h-4 text-purple-500" />;
    }
  };

  const getTypeBadgeStyle = (type: SemesterFileType) => {
    switch (type) {
      case 'pdf':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'ppt':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'excel':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'image':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'doc':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B0C10]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222434] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 min-w-0">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#282A3A] hover:bg-slate-100 dark:hover:bg-[#1E202E] text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-[#1A1B28] border border-slate-700/50 dark:border-[#2E3044] flex items-center justify-center text-[#8048A8] dark:text-[#D1A7FF] shadow-sm flex-shrink-0">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8048A8] dark:text-[#D1A7FF]" />
              </div>
              <div>
                <h1 className="hidden sm:block text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                  Semester Data
                </h1>
              </div>
            </div>
          </div>

          {/* Center: Search Bar matching MarksPage */}
          <div className="relative flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code or subject..."
                className="w-full pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full bg-slate-50 dark:bg-[#151621] border border-slate-200 dark:border-[#282A3A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8048A8]/40 focus:border-[#8048A8] transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Live Refresh Button */}
            <button
              onClick={() => loadFiles(selectedSemester, true)}
              disabled={isRefreshing}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-[#282A3A] hover:bg-slate-100 dark:hover:bg-[#1E202E] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Refresh semester resources"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#8048A8]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 w-full space-y-4 sm:space-y-6">
        {/* Wireframe: SELECT SEMESTER Bar */}
        <SemesterSelector
          currentSemester={selectedSemester}
          availableSemesters={[1, 2, 3]}
          onSelectSemester={setSelectedSemester}
          label="SELECT SEMESTER"
          badgeText={`${files.length} Files in Sem ${selectedSemester}`}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingState message="Loading semester resources..." />
          </div>
        ) : files.length === 0 ? (
          /* Empty State - No files uploaded */
          <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-[#2A2B3D] bg-white dark:bg-[#151621] shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] dark:ring-1 dark:ring-white/[0.07] text-center max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#1E202E] border border-slate-200 dark:border-[#2C2E40] flex items-center justify-center text-slate-500 mx-auto mb-3">
              <HardDrive className="w-7 h-7 text-[#8048A8] dark:text-[#D1A7FF]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No files found for Semester {selectedSemester}
            </h3>
          </div>
        ) : filteredFiles.length === 0 ? (
          /* Empty State - No search matches */
          <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-[#2A2B3D] bg-white dark:bg-[#151621] shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] dark:ring-1 dark:ring-white/[0.07] text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1E202E] border border-slate-200 dark:border-[#2C2E40] flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Search className="w-6 h-6 text-[#8048A8] dark:text-[#D1A7FF]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              No matching resources
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
              No resources in Semester {selectedSemester} matched &ldquo;{searchQuery}&rdquo;. Try another subject code or topic keyword.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Search</span>
            </button>
          </div>
        ) : (
          /* File Cards Grid */
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-900 dark:text-white">{filteredFiles.length}</strong>{' '}
                resource{filteredFiles.length === 1 ? '' : 's'}
                {searchQuery.trim() && (
                  <span className="ml-1 text-slate-400">
                    matching &ldquo;<span className="text-slate-700 dark:text-slate-200 font-medium">{searchQuery}</span>&rdquo;
                  </span>
                )}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#8048A8] dark:text-[#D1A7FF] hover:underline font-medium"
                >
                  Clear search
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-[#2A2B3D] bg-white dark:bg-[#151621] p-4 sm:p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] dark:ring-1 dark:ring-white/[0.07] flex flex-col justify-between hover:border-[#8048A8]/60 dark:hover:border-[#9D5BD2]/60 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_14px_35px_rgba(0,0,0,0.85)] hover:-translate-y-1 transition-all duration-200 group"
                >
                  {/* Card Top: Badges & Icon */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1E202E] border border-slate-200/80 dark:border-[#2C2E40] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          {getFileIcon(file.fileType)}
                        </div>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getTypeBadgeStyle(
                            file.fileType
                          )}`}
                        >
                          {file.extension.toUpperCase()}
                        </span>
                      </div>

                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] border border-[#8048A8]/20">
                        {file.subject}
                      </span>
                    </div>

                    {/* Card Title (Topic) */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1 group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors line-clamp-2">
                      {file.topic}
                    </h3>

                    {/* Original Filename */}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate mb-3" title={file.name}>
                      {file.name}
                    </p>
                  </div>

                  {/* Card Bottom: Actions */}
                  <div className="mt-auto pt-2">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="py-1.5 px-2 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all touch-manipulation cursor-pointer"
                        title="Preview file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {/* Download Button */}
                      <a
                        href={file.downloadUrl}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 rounded-xl border border-slate-200 dark:border-[#2D3042] bg-transparent hover:bg-slate-100 dark:hover:bg-[#1E202E] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default SemesterDataPage;
