import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  Mail,
  HelpCircle,
  Bookmark,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { JobMatch } from '../types';

export const JobMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<JobMatch | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await api.getMatches();
      setMatches(data);
      if (data.length > 0 && !selectedMatch) {
        setSelectedMatch(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCV = async (jobId: string) => {
    try {
      setActionNotice('Tailoring ATS-optimized CV...');
      await api.generateCV(jobId);
      setActionNotice('Tailored CV generated in both PDF and DOCX!');
      setTimeout(() => navigate('/documents'), 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to generate tailored CV');
      setActionNotice(null);
    }
  };

  const handleGenerateCoverLetter = async (jobId: string) => {
    try {
      setActionNotice('Drafting customized cover letter...');
      await api.generateCoverLetter(jobId);
      setActionNotice('Cover letter generated in both PDF and DOCX!');
      setTimeout(() => navigate('/documents'), 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to generate cover letter');
      setActionNotice(null);
    }
  };

  const handlePrepareInterview = async (jobId: string) => {
    try {
      setActionNotice('Generating interview preparation questions...');
      await api.generateInterviewPrep(jobId);
      setActionNotice('Interview materials ready!');
      setTimeout(() => navigate('/interviews'), 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to prepare interview materials');
      setActionNotice(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Transparent Scoring Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI Compatibility Matching</h1>
        <p className="text-sm text-slate-500 mt-1">
          Multidimensional alignment assessment evaluating technical skills, work duration, degrees, and location fit.
        </p>
      </div>

      {/* Methodology Explainer Alert */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Transparent Weighted Scoring Model</p>
          <p>
            Weights: <strong>Skills (40%)</strong>, <strong>Experience (25%)</strong>, <strong>Education (15%)</strong>, <strong>Location (10%)</strong>, and <strong>Responsibilities (10%)</strong>.
            The algorithm verifies actual project accomplishments and employment durations rather than simple keyword repetition.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center space-x-2 animate-pulse">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Evaluating compatibility matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Sparkles className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No compatibility evaluations yet</h3>
          <p className="text-xs text-slate-500 mt-1">Visit "Find Jobs" to discover vacancies and trigger real-time AI evaluations.</p>
          <NavLink
            to="/jobs"
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Go to Find Jobs
          </NavLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Matches List (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Evaluated Vacancies ({matches.length})
            </h2>

            {matches.map((match) => {
              const isSelected = selectedMatch?.id === match.id;
              const job = match.job;
              return (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {job?.title || 'Target Role'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{job?.company} • {job?.location || 'Remote'}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                        match.overall_score >= 80
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : match.overall_score >= 60
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {match.overall_score.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Match Detail View (Right 7 cols) */}
          {selectedMatch && selectedMatch.job && (
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Detailed Compatibility Review
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                    {selectedMatch.job.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedMatch.job.company} • {selectedMatch.job.location || 'Remote'} ({selectedMatch.job.location_type})
                  </p>
                </div>

                <div className="text-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {selectedMatch.overall_score.toFixed(0)}%
                  </p>
                  <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mt-1">Match Score</p>
                </div>
              </div>

              {/* Sub-Score Breakdown Bars */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">Algorithm Dimensions</p>
                {[
                  { label: 'Technical Skills (40%)', score: selectedMatch.skill_score },
                  { label: 'Experience Years (25%)', score: selectedMatch.experience_score },
                  { label: 'Education Alignment (15%)', score: selectedMatch.education_score },
                  { label: 'Location & Remote Fit (10%)', score: selectedMatch.location_score },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{item.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.score.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Matching Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Matching Qualifications</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMatch.matching_requirements.length > 0 ? (
                    selectedMatch.matching_requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      >
                        ✓ {req}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No direct skill matches identified.</span>
                  )}
                </div>
              </div>

              {/* Missing Qualifications */}
              {selectedMatch.missing_qualifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Missing or Unverified Qualifications</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMatch.missing_qualifications.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      >
                        ✗ {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Suggestions */}
              {selectedMatch.suggestions.length > 0 && (
                <div className="space-y-2 bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900 text-xs">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Agent Recommendations</span>
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    {selectedMatch.suggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons to Advance Workflow */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleGenerateCV(selectedMatch.job!.id)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Tailored CV</span>
                </button>

                <button
                  onClick={() => handleGenerateCoverLetter(selectedMatch.job!.id)}
                  className="flex items-center space-x-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>Draft Cover Letter</span>
                </button>

                <button
                  onClick={() => handlePrepareInterview(selectedMatch.job!.id)}
                  className="flex items-center space-x-1.5 px-4 py-2 border border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-semibold transition-all"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Prepare Interview</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

