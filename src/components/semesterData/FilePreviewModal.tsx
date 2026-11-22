import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  File,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SemesterDriveFile, SemesterFileType } from '../../services/semesterData';

interface FilePreviewModalProps {
  file: SemesterDriveFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (file) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [file, onClose]);

  // Reset loading and error when file changes
  useEffect(() => {
    if (file) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [file?.id]);

  if (!file) return null;

  // Icon & theme by file type
  const getBadgeConfig = (type: SemesterFileType) => {
    switch (type) {
      case 'pdf':
        return {
          icon: FileText,
          label: 'PDF Document',
          badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'ppt':
        return {
          icon: Presentation,
          label: 'Presentation (PPT)',
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'excel':
        return {
          icon: FileSpreadsheet,
          label: 'Spreadsheet (Excel)',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'image':
        return {
          icon: ImageIcon,
          label: 'Image',
          badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'doc':
        return {
          icon: FileText,
          label: 'Document',
          badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      default:
        return {
          icon: File,
          label: 'File',
          badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
    }
  };

  const badge = getBadgeConfig(file.fileType);
  const IconComponent = badge.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Background click outside */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full bg-white dark:bg-[#151621] border border-slate-200 dark:border-[#282A3A] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'h-[98vh] max-w-[98vw]'
            : 'h-[90vh] max-w-5xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-[#222434] bg-slate-50/80 dark:bg-[#10111A]/90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-[#1C1D2A] border border-slate-800 dark:border-[#2E3044] flex items-center justify-center text-white flex-shrink-0">
              <IconComponent className="w-4 h-4 text-[#F8D299]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {file.topic}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] border border-[#8048A8]/20">
                  {file.subject}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badge.badgeClass}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {file.name} • {file.formattedSize}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Direct Download */}
            <a
              href={file.downloadUrl}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#242430] hover:bg-slate-100 dark:hover:bg-[#1A1A22] text-slate-600 dark:text-slate-400 transition-colors hidden md:flex items-center justify-center"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#242430] hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-[#0B0C10] overflow-hidden flex items-center justify-center">
          {/* Loading Spinner */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-white/80 dark:bg-[#07070A]/80 backdrop-blur-xs">
              <Loader2 className="w-7 h-7 text-[#8048A8] dark:text-[#D1A7FF] animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Loading file preview...
              </p>
            </div>
          )}

          {/* Error fallback */}
          {hasError ? (
            <div className="p-8 text-center max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Preview Unavailable in Embedded Mode
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Browser privacy restrictions may prevent previewing this file. You can open or download it directly.
              </p>
              <div className="flex items-center justify-center gap-2">
                <a
                  href={file.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#8048A8] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Original File</span>
                </a>
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A36] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : file.fileType === 'image' ? (
            /* Image viewer */
            <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
              <img
                src={file.previewUrl}
                alt={file.topic}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md transition-opacity duration-300"
              />
            </div>
          ) : (
            /* Preview Iframe */
            <iframe
              src={file.previewUrl}
              title={file.name}
              className="w-full h-full border-0"
              allow="autoplay"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          )}
        </div>

        {/* Bottom Help Bar */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-[#222434] bg-slate-50 dark:bg-[#10111A] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-shrink-0">
          <span>Press Esc to close</span>

          <a
            href={file.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8048A8] dark:text-[#D1A7FF] hover:underline flex items-center gap-1"
          >
            <span>Trouble viewing? Open File</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
