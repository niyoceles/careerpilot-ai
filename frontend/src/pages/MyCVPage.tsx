import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { CV, ProfessionalProfile } from '../types';

export const MyCVPage: React.FC = () => {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cvList, prof] = await Promise.all([
        api.getCVs(),
        api.getProfile().catch(() => null)
      ]);
      setCvs(cvList);
      setProfile(prof);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load CVs' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      await api.uploadCV(file);
      setMessage({
        type: 'success',
        text: `Successfully uploaded ${file.name}. CV Analyzer Agent extracted your skills and professional profile!`
      });
      await loadData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to parse CV file. Please ensure it is a valid PDF or DOCX file.'
      });
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CV record?')) return;
    try {
      await api.deleteCV(id);
      setMessage({ type: 'success', text: 'CV deleted successfully.' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete CV.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Curriculum Vitae</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload your original PDF or DOCX resume. The CV Analyzer Agent parses structure, contacts, dates, skills, and work history.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center space-x-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center bg-white dark:bg-slate-900 hover:border-indigo-500 transition-colors">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {uploading ? 'Analyzing CV with AI Agent...' : 'Upload your Resume / CV'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF and DOCX files up to 15MB. The analyzer extracts structured profile data without fabricating information.
            </p>
          </div>

          <label className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer shadow-md shadow-indigo-600/20 transition-all">
            <span>{uploading ? 'Processing Document...' : 'Select File from Device'}</span>
            <input
              type="file"
              accept=".pdf,.docx"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Extracted Profile Summary Banner */}
      {profile && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Extracted Professional Identity</h3>
                <p className="text-xs text-slate-500">
                  {profile.full_name || 'Candidate'} • {profile.total_experience_years.toFixed(1)} Years Recorded Experience
                </p>
              </div>
            </div>
            <NavLink
              to="/profile"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <span>Review & Edit Full Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
            {profile.summary || 'Summary ready for editing.'}
          </p>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Identified Core Skills</span>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.length > 0 ? (
                profile.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    {s.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No skills parsed yet.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploaded CVs List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Uploaded CV Files</h2>
        </div>

        {cvs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No CV files stored yet. Use the upload box above to upload your resume.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {cvs.map((cv) => (
              <div key={cv.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{cv.filename}</p>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                      <span>{(cv.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span className="uppercase">{cv.file_type}</span>
                      <span>•</span>
                      <span>{new Date(cv.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={api.downloadCVUrl(cv.id)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                    title="Download Original CV"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(cv.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete CV"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

