import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  Download,
  Eye,
  ExternalLink,
  Sparkles,
  Files,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { api } from '../services/api';
import { GeneratedDocument } from '../types';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDocs();
  }, [docTypeFilter]);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments(docTypeFilter || undefined);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGmailDraftUrl = (doc: GeneratedDocument) => {
    const subject = encodeURIComponent(doc.content_json?.subject || doc.title);
    const body = encodeURIComponent(doc.content_json?.body || doc.content_text || '');
    const to = encodeURIComponent(doc.content_json?.recipient_email || '');
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  };

  const getMailtoUrl = (doc: GeneratedDocument) => {
    const subject = encodeURIComponent(doc.content_json?.subject || doc.title);
    const body = encodeURIComponent(doc.content_json?.body || doc.content_text || '');
    const to = doc.content_json?.recipient_email || '';
    return `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Generated Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Download ATS-formatted tailored resumes, persuasive cover letters, and application email pitches.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: '', label: 'All Documents' },
            { id: 'tailored_cv', label: 'Tailored CVs' },
            { id: 'cover_letter', label: 'Cover Letters' },
            { id: 'application_email', label: 'Emails' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setDocTypeFilter(type.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                docTypeFilter === type.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Loading generated documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Files className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No generated documents yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate a vacancy in "Job Matches" and click "Tailor CV" or "Draft Cover Letter" to generate documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const isEmail = doc.document_type === 'application_email';
            const isCoverLetter = doc.document_type === 'cover_letter';
            const isCV = doc.document_type === 'tailored_cv';

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isCV
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : isCoverLetter
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {doc.document_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[11px]">
                    {doc.content_text || doc.content_json?.summary || 'Document ready'}
                  </p>
                </div>

                {/* Document Download / Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {!isEmail ? (
                    <div className="flex items-center space-x-2">
                      {doc.file_path_pdf && (
                        <a
                          href={api.downloadDocumentUrl(doc.id, 'pdf')}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      )}
                      {doc.file_path_docx && (
                        <a
                          href={api.downloadDocumentUrl(doc.id, 'docx')}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>DOCX</span>
                        </a>
                      )}
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600"
                        title="Preview text"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Email Actions */
                    <div className="space-y-1.5">
                      <div className="flex space-x-2">
                        <a
                          href={getMailtoUrl(doc)}
                          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send via Mail</span>
                        </a>
                        <a
                          href={getGmailDraftUrl(doc)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Gmail Web</span>
                        </a>
                      </div>
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="w-full text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        Inspect Full Body
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate pr-4">
                {previewDoc.title}
              </h3>
              <button
                onClick={() => handleCopyText(previewDoc.content_text)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold shrink-0"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {previewDoc.content_text}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

