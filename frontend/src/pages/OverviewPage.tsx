import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Briefcase,
  Sparkles,
  Send,
  Calendar,
  Award,
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardOverview } from '../types';

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardOverview();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-sm text-slate-500">Loading CareerPilot insights from database...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
        <p className="font-semibold">Unable to load dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Discovered Jobs', value: data.total_jobs_discovered, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Strong Matches', value: data.strong_matches_count, icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Active Pipeline', value: data.applications_submitted, icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Interviews Scheduled', value: data.interviews_scheduled, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { label: 'Offers Received', value: data.offers_received, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Profile Completion Progress */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 uppercase tracking-wider">
            Autonomous Career Command
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
            Welcome to CareerPilot AI
          </h1>
          <p className="mt-2 text-indigo-100/90 text-sm leading-relaxed">
            Your end-to-end career copilot is monitoring regional tech ecosystems in Kigali, East Africa, and high-impact remote vacancies worldwide.
          </p>

          {/* Profile completion meter */}
          <div className="mt-6 pt-4 border-t border-indigo-700/50">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span>Profile Readiness for Matching</span>
              <span>{data.profile_completion_percentage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-indigo-950/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${data.profile_completion_percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
                <div className={`p-2 rounded-xl ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold mt-3 text-slate-900 dark:text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Pipeline Breakdown & Recommended Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recommended Jobs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Top Recommended Jobs</h2>
              <p className="text-xs text-slate-500">Curated opportunities matched against your verified skills</p>
            </div>
            <NavLink
              to="/matches"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
            >
              View all matches <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </NavLink>
          </div>

          <div className="space-y-3">
            {data.recommended_jobs.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No jobs matched yet</p>
                <p className="text-xs text-slate-500 mt-1">Upload your CV to compute instant compatibility scores.</p>
                <NavLink
                  to="/cv"
                  className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  Upload CV
                </NavLink>
              </div>
            ) : (
              data.recommended_jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{job.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {job.match_score ? `${job.match_score.toFixed(0)}% Match` : 'Verified'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {job.company} • {job.location || 'Remote'} ({job.location_type})
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.required_skills.slice(0, 4).map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <NavLink
                      to={`/matches`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Score Breakdown
                    </NavLink>
                    <NavLink
                      to={`/documents`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Tailor Documents
                    </NavLink>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Pipeline Status & Activity Stream */}
        <div className="space-y-6">
          {/* Pipeline Breakdown card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Application Pipeline</h2>
            <div className="space-y-2.5">
              {Object.entries(data.pipeline_breakdown).slice(0, 6).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{status}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, count * 25)}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <NavLink
                to="/applications"
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Open Applications Board →
              </NavLink>
            </div>
          </div>

          {/* Recent Activity stream */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Agent Activity</h2>
            {data.recent_activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No recent activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recent_activities.map((act) => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{act.title}</p>
                      <p className="text-slate-500 text-[11px]">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

