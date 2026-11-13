import React, { useState, useEffect } from 'react';
import {
  Kanban as KanbanIcon,
  Table as TableIcon,
  Search,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { api } from '../services/api';
import { Application } from '../types';

const STATUS_COLUMNS = [
  'Saved',
  'Analyzing',
  'Ready to Apply',
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected'
];

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  
  // Note editing modal
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await api.getApplications();
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await api.updateApplication(appId, { status: newStatus });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Are you sure you want to remove this application?')) return;
    try {
      await api.deleteApplication(appId);
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete application');
    }
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setEditNotes(app.notes || '');
    setEditFollowUp(app.follow_up_date ? app.follow_up_date.split('T')[0] : '');
  };

  const saveEditModal = async () => {
    if (!editingApp) return;
    try {
      const updated = await api.updateApplication(editingApp.id, {
        notes: editNotes,
        follow_up_date: editFollowUp ? new Date(editFollowUp).toISOString() : undefined
      });
      setApplications(prev => prev.map(a => a.id === editingApp.id ? updated : a));
      setEditingApp(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update notes');
    }
  };

  const filteredApps = applications.filter(a => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      a.job?.title.toLowerCase().includes(term) ||
      a.job?.company.toLowerCase().includes(term) ||
      a.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Application Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track application lifecycles from initial discovery to interviews and offers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter applications by role, company, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Loading applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No applications recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1">Explore vacancies in "Find Jobs" and click "Save to Pipeline" to start tracking.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="flex space-x-4 overflow-x-auto pb-6">
          {STATUS_COLUMNS.map((columnStatus) => {
            const columnApps = filteredApps.filter(a => a.status === columnStatus);
            return (
              <div
                key={columnStatus}
                className="w-72 shrink-0 bg-slate-100/70 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {columnStatus}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-xs">
                    {columnApps.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {columnApps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 hover:shadow-sm transition-shadow"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                          {app.job?.title || 'Position'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{app.job?.company || 'Company'}</p>
                      </div>

                      {app.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg line-clamp-2">
                          {app.notes}
                        </p>
                      )}

                      {/* Status select dropdown */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="text-[11px] font-semibold py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          {STATUS_COLUMNS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openEditModal(app)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Edit notes & reminders"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Role & Company</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Follow-Up Date</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{app.job?.title}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{app.job?.company}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className="py-1 px-2 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        {STATUS_COLUMNS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {app.follow_up_date ? new Date(app.follow_up_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {app.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(app)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-rose-600 hover:underline font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Notes & Follow-Up Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Application Details & Reminders
            </h3>
            <p className="text-xs text-slate-500">
              {editingApp.job?.title} at {editingApp.job?.company}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Follow-Up Date</label>
                <input
                  type="date"
                  value={editFollowUp}
                  onChange={(e) => setEditFollowUp(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Internal Notes</label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record interview notes, contact recruiter names, or interview feedback..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEditModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

