import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Search,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  Eye,
  RefreshCw,
  X,
  ChevronRight,
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { noticeService } from '../../services/noticeService';
import { NoticeItem } from '../../types/notice';
import { ROUTES } from '../../utils/constants';

export const NoticesPage: React.FC = () => {
  const navigate = useNavigate();

  const [notices, setNotices] = useState<NoticeItem[]>(() => noticeService.getLocalNotices());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Document Preview Modal
  const [previewDocument, setPreviewDocument] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Load notices on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    noticeService.fetchNotices(false).then((res) => {
      if (isMounted) {
        if (res.success && res.data) {
          setNotices(res.data);
        }
        setIsLoading(false);
      }
    });

    const handleNoticesChanged = (e: Event) => {
      const customEvt = e as CustomEvent<NoticeItem[]>;
      if (customEvt.detail && isMounted) {
        setNotices(customEvt.detail);
      }
    };

    window.addEventListener('portal_notices_changed', handleNoticesChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('portal_notices_changed', handleNoticesChanged);
    };
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await noticeService.fetchNotices(true);
      if (res.success && res.data) {
        setNotices(res.data);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Format date time
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Helper to generate direct Google Drive download link
  const getDownloadUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}&confirm=t`;
    }
    return url;
  };

  // Filtered notices (by search query)
  const filteredNotices = useMemo(() => {
    if (!searchQuery.trim()) return notices;
    const q = searchQuery.toLowerCase().trim();
    return notices.filter((notice) => {
      const matchTitle = (notice.title || '').toLowerCase().includes(q);
      const matchContent = (notice.content || '').toLowerCase().includes(q);
      const matchId = (notice.id || '').toLowerCase().includes(q);
      const matchDoc = (notice.documentName || '').toLowerCase().includes(q);
      return matchTitle || matchContent || matchId || matchDoc;
    });
  }, [notices, searchQuery]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222228] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#222228] hover:bg-slate-100 dark:hover:bg-[#16161B] text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-[#16161B] border border-slate-700/50 dark:border-[#8048A8]/40 flex items-center justify-center text-[#8048A8] dark:text-[#D1A7FF] shadow-sm flex-shrink-0">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8048A8] dark:text-[#D1A7FF]" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                  Notices &amp; Announcements
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Circulars, schedules, and documents
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#222228] hover:bg-slate-100 dark:hover:bg-[#16161B] text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-60"
              title="Refresh Notices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#8048A8]' : ''}`} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-7 flex-1 w-full space-y-5">
        {/* Controls Bar: Search */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 dark:border-[#22222A] bg-white/70 dark:bg-[#0E0E14]/70 backdrop-blur-md shadow-card dark:shadow-card-dark">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices, circulars, IDs, keywords, documents..."
              className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#2A2A34] bg-slate-50 dark:bg-[#14141B] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8048A8] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Notices Count Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{filteredNotices.length}</strong> notice{filteredNotices.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Loading Skeletons */}
        {isLoading && notices.length === 0 && (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 rounded-2xl border border-slate-200 dark:border-[#22222E] bg-white/60 dark:bg-[#0E0E14]/60 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 bg-slate-200 dark:bg-[#1E1E28] rounded-md" />
                  <div className="h-5 w-20 bg-slate-200 dark:bg-[#1E1E28] rounded-md" />
                </div>
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-[#1E1E28] rounded-md" />
                <div className="h-16 w-full bg-slate-100 dark:bg-[#161620] rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Notices Cards List */}
        {!isLoading && filteredNotices.length === 0 && (
          <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-[#2A2A34] bg-white/40 dark:bg-[#0A0A0E]/40 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-1">
              No Notices Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              {searchQuery
                ? `No notices match your search "${searchQuery}". Try different keywords.`
                : 'No announcements have been published yet.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-[#1C1C24] text-white text-xs font-semibold cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Render Notices */}
        <div className="space-y-2.5 sm:space-y-3">
          {filteredNotices.map((notice) => (
            <div
              key={notice.id}
              onClick={() => setSelectedNotice(notice)}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white/90 dark:bg-[#0E0E14]/90 backdrop-blur-md shadow-card dark:shadow-card-dark hover:border-[#8048A8] dark:hover:border-[#8048A8] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-slate-500 dark:text-slate-400 text-[11px]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatDateTime(notice.timestamp)}</span>
                  </div>
                  {((notice.documents && notice.documents.length > 0) || notice.documentUrl) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/40">
                      <FileText className="w-2.5 h-2.5" />
                      <span>
                        {notice.documents && notice.documents.length > 1
                          ? `${notice.documents.length} Attachments`
                          : 'Attachment'}
                      </span>
                    </span>
                  )}
                  {notice.links && notice.links.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40">
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>{notice.links.length} Link{notice.links.length > 1 ? 's' : ''}</span>
                    </span>
                  )}
                </div>
                {/* Subject (Title) */}
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors leading-snug">
                  {notice.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] flex-shrink-0 transition-colors">
                <span className="text-xs font-semibold hidden sm:inline">View Notice</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Notice Reader Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#282834] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#22222A] bg-slate-50/80 dark:bg-[#121218]/80 flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDateTime(selectedNotice.timestamp)}</span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedNotice.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#20202A] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(88vh-140px)]">
              {/* Notice Content */}
              {selectedNotice.content ? (
                <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-[#12121A] border border-slate-200/80 dark:border-[#1E1E28] text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {selectedNotice.content}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#12121A]/50 border border-dashed border-slate-200 dark:border-[#1E1E28] text-xs text-slate-500 italic">
                  No additional written description provided. Please view the attached document or link below.
                </div>
              )}

              {/* Document Attachments (Multiple Supported) */}
              {((selectedNotice.documents && selectedNotice.documents.length > 0) || selectedNotice.documentUrl) && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
                    <span>
                      Attached Documents ({selectedNotice.documents && selectedNotice.documents.length > 0 ? selectedNotice.documents.length : 1})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(selectedNotice.documents && selectedNotice.documents.length > 0
                      ? selectedNotice.documents
                      : [{ name: selectedNotice.documentName || 'Notice Document', url: selectedNotice.documentUrl! }]
                    ).map((doc, docIdx) => (
                      <div
                        key={docIdx}
                        className="p-3 sm:p-3.5 rounded-xl bg-purple-50/50 dark:bg-[#161320]/60 border border-purple-200/70 dark:border-[#322442] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-[#8048A8] dark:text-[#D1A7FF] flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Verified document attachment
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDocument({
                                name: doc.name,
                                url: doc.url,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8048A8] hover:bg-[#6c3990] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <a
                            href={getDownloadUrl(doc.url)}
                            target="_blank"
                            rel="noreferrer"
                            download={doc.name}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1C1C26] hover:bg-slate-100 dark:hover:bg-[#252532] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2E2E3C] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Helpful Links (Multiple Supported) */}
              {selectedNotice.links && selectedNotice.links.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Helpful Links ({selectedNotice.links.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedNotice.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#181822] hover:bg-slate-200 dark:hover:bg-[#222230] text-[#8048A8] dark:text-[#D1A7FF] text-xs font-medium border border-slate-200 dark:border-[#262634] transition-all"
                      >
                        <span className="truncate max-w-[280px]">{link}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-[#22222A] bg-slate-50 dark:bg-[#121218] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-[#20202A] hover:bg-slate-300 dark:hover:bg-[#282834] text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl h-[88vh] bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#282834] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#22222A] flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#121218]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#8048A8] dark:text-[#D1A7FF] flex-shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {previewDocument.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getDownloadUrl(previewDocument.url)}
                  target="_blank"
                  rel="noreferrer"
                  download={previewDocument.name}
                  className="px-2.5 py-1 rounded-lg bg-[#8048A8] hover:bg-[#6c3990] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>
                <a
                  href={previewDocument.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1A1A22] border border-slate-200 dark:border-[#2A2A34] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 hover:bg-slate-100"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#20202A] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body iframe */}
            <div className="flex-1 w-full bg-slate-100 dark:bg-[#0A0A0E] relative">
              <iframe
                src={previewDocument.url.replace('/view', '/preview')}
                title={previewDocument.name}
                className="w-full h-full border-0"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticesPage;
