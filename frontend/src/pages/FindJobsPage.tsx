import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  MapPin,
  Briefcase,
  ExternalLink,
  Bookmark,
  Sparkles,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { Job } from '../types';

export const FindJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [locationType, setLocationType] = useState('');
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  // Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Manual Job Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualLocation, setManualLocation] = useState('Kigali, Rwanda');

  useEffect(() => {
    loadJobs();
  }, [locationType]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getJobs({
        query: query || undefined,
        location_type: locationType || undefined
      });
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleDiscoverRefresh = async () => {
    try {
      setMessage('Job Discovery Agent searching authorized feeds...');
      const res = await api.searchJobs();
      setMessage(`Discovery complete: Found ${res.new_jobs_found} fresh vacancies!`);
      loadJobs();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(`Discovery notice: ${err.message}`);
    }
  };

  const handleSaveJob = async (jobId: string) => {
    try {
      await api.saveJob(jobId);
      setSavedJobIds(prev => new Set([...prev, jobId]));
      setMessage('Job saved directly to your Applications Pipeline!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save job');
    }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setImporting(true);
    try {
      const imported = await api.importJobUrl(importUrl);
      setImportModalOpen(false);
      setImportUrl('');
      setMessage(`Imported vacancy: ${imported.title} at ${imported.company}!`);
      loadJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to import from URL');
    } finally {
      setImporting(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.importManualJob({
        title: manualTitle,
        company: manualCompany,
        description: manualDesc,
        location: manualLocation,
        location_type: 'hybrid'
      });
      setManualModalOpen(false);
      setManualTitle('');
      setManualCompany('');
      setManualDesc('');
      setMessage('Manual job vacancy recorded successfully!');
      loadJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to create job');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Discover Job Vacancies</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time verified opportunities in Rwanda, Kigali, East Africa, and high-impact global remote roles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDiscoverRefresh}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Discover Feeds</span>
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Import from URL</span>
          </button>
          <button
            onClick={() => setManualModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Vacancy</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by job title, company, or tech stack (e.g. Python, React)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* Location Type Filter Pills */}
        <div className="flex items-center space-x-2 pt-1 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium mr-1">Workplace:</span>
          {[
            { id: '', label: 'All Modes' },
            { id: 'remote', label: 'Remote' },
            { id: 'hybrid', label: 'Hybrid' },
            { id: 'on_site', label: 'On-site' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setLocationType(type.id)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                locationType === type.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job Listings Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Loading verified vacancies...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No vacancies matching criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try broadening your keywords or click "Discover Feeds" to fetch more.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const isSaved = savedJobIds.has(job.id);
            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{job.title}</h3>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                        {job.company}
                      </p>
                    </div>

                    {job.match_score !== null && job.match_score !== undefined ? (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{job.match_score.toFixed(0)}%</span>
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.location || 'Remote'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {job.location_type}
                    </span>
                    {job.salary_min && (
                      <span className="flex items-center text-slate-700 dark:text-slate-300 font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{job.salary_min.toLocaleString()} - {job.salary_max ? job.salary_max.toLocaleString() : '+'} {job.currency}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.required_skills.slice(0, 5).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {job.original_url && (
                      <a
                        href={job.original_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-1"
                      >
                        <span>Original Listing</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSaveJob(job.id)}
                      disabled={isSaved}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-colors ${
                        isSaved
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={isSaved ? 'Saved in Applications' : 'Save to Pipeline'}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>

                    <NavLink
                      to={`/matches`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Assess Match
                    </NavLink>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import from URL Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Import Job from URL</h3>
            <p className="text-xs text-slate-500">
              Paste the public URL of any job posting (e.g. from company careers page, LinkedIn, or job board).
            </p>
            <form onSubmit={handleImportUrl} className="space-y-4">
              <input
                type="url"
                required
                placeholder="https://example.com/careers/software-engineer"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {importing ? 'Extracting with Agent...' : 'Import Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Job Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Custom Job Vacancy</h3>
            <form onSubmit={handleManualCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Company</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Irembo or Andela"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Kigali, Rwanda or Remote"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Job Description & Requirements</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste vacancy details, required qualifications, and duties..."
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                >
                  Save Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

