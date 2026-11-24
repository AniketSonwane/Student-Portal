export interface NoticeDocument {
  name: string;
  url: string;
}

export interface NoticeItem {
  id: string; // Unique notice id (e.g. NTC-20261121-001)
  timestamp: string; // ISO date string or formatted datetime
  semester?: number | 'ALL';
  title: string;
  content: string;
  links?: string[]; // Multiple optional links
  documentName?: string; // Main / first document name (backward compatible)
  documentUrl?: string; // Main / first document URL (backward compatible)
  documents?: NoticeDocument[]; // Multiple attached documents
  folderId?: string; // Google Drive folder ID for this notice
  folderUrl?: string; // Google Drive folder link
}

export interface NoticeFileInput {
  name: string;
  type: string;
  base64: string;
}

export interface CreateNoticeInput {
  id?: string;
  timestamp?: string;
  semester?: number | 'ALL';
  title: string;
  content: string;
  links?: string[];
  file?: NoticeFileInput; // Single file (backward compatible)
  files?: NoticeFileInput[]; // Multiple files
}

export interface UpdateNoticeInput {
  timestamp?: string; // Optional custom or updated timestamp in IST
  semester?: number | 'ALL';
  title?: string;
  content?: string;
  links?: string[];
  documents?: NoticeDocument[];
  deletedDocuments?: NoticeDocument[];
  file?: NoticeFileInput;
  files?: NoticeFileInput[];
}
