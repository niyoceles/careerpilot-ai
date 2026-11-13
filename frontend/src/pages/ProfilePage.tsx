import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Code,
  FolderGit2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { ProfessionalProfile, WorkExperience, Education, Skill, Project } from '../types';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'preferences'>('summary');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New skill input
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('technical');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfile(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (confirmed?: boolean) => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload: Partial<ProfessionalProfile> = {
        ...profile,
        is_confirmed: confirmed !== undefined ? confirmed : profile.is_confirmed
      };
      const updated = await api.updateProfile(payload);
      setProfile(updated);
      setMessage({
        type: 'success',
        text: confirmed ? 'Profile verified & locked as official master source for AI generation!' : 'Profile saved successfully!'
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkillName.trim() || !profile) return;
    const exists = profile.skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase());
    if (exists) return;

    const newSkill: Skill = {
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: 'advanced',
      years_of_experience: 2.0
    };

    setProfile({
      ...profile,
      skills: [...profile.skills, newSkill]
    });
    setNewSkillName('');
  };

  const removeSkill = (name: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s.name !== name)
    });
  };

  const addExperience = () => {
    if (!profile) return;
    const newExp: WorkExperience = {
      company: 'New Company',
      position: 'Software Engineer',
      location: 'Kigali, Rwanda',
      start_date: '2022',
      end_date: 'Present',
      is_current: true,
      description: 'Key technical achievements and responsibilities.',
      achievements: ['Delivered core platform features.']
    };
    setProfile({
      ...profile,
      work_experiences: [newExp, ...profile.work_experiences]
    });
  };

  const updateExperience = (index: number, field: keyof WorkExperience, value: any) => {
    if (!profile) return;
    const exps = [...profile.work_experiences];
    exps[index] = { ...exps[index], [field]: value };
    setProfile({ ...profile, work_experiences: exps });
  };

  const removeExperience = (index: number) => {
    if (!profile) return;
    const exps = profile.work_experiences.filter((_, i) => i !== index);
    setProfile({ ...profile, work_experiences: exps });
  };

  const addEducation = () => {
    if (!profile) return;
    const newEdu: Education = {
      institution: 'University of Rwanda',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      start_date: '2018',
      end_date: '2022'
    };
    setProfile({
      ...profile,
      education: [...profile.education, newEdu]
    });
  };

  const removeEducation = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      education: profile.education.filter((_, i) => i !== index)
    });
  };

  if (loading || !profile) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Loading professional profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Professional Master Profile</h1>
            {profile.is_confirmed ? (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confirmed & Verified</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending Human Confirmation</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            This profile serves as the source of truth for generating tailored CVs, cover letters, and email pitches.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleSaveProfile(false)}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSaveProfile(true)}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Master Profile</span>
          </button>
        </div>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm overflow-x-auto">
        {[
          { id: 'summary', label: 'Summary & Basics', icon: UserCheck },
          { id: 'skills', label: `Skills (${profile.skills.length})`, icon: Code },
          { id: 'experience', label: `Experience (${profile.work_experiences.length})`, icon: Briefcase },
          { id: 'education', label: `Education (${profile.education.length})`, icon: GraduationCap },
          { id: 'preferences', label: 'Preferences', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 border-b-2 font-semibold text-xs transition-colors shrink-0 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Summary & Basics */}
      {activeTab === 'summary' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Location</label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Total Years of Experience</label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{profile.total_experience_years.toFixed(1)} Years</span>
            </div>
            <input
              type="number"
              step="0.5"
              min="0"
              max="35"
              value={profile.total_experience_years}
              onChange={(e) => setProfile({ ...profile, total_experience_years: parseFloat(e.target.value) || 0 })}
              className="w-32 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Professional Summary</label>
            <textarea
              rows={5}
              value={profile.summary || ''}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              placeholder="Detail your engineering background, specializations, and career achievements..."
            />
          </div>
        </div>
      )}

      {/* Tab 2: Skills */}
      {activeTab === 'skills' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          {/* Add skill input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. FastAPI, PostgreSQL, Kubernetes..."
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); }}}
              className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <select
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              className="px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="technical">Technical</option>
              <option value="soft">Soft Skill</option>
              <option value="language">Language</option>
            </select>
            <button
              onClick={addSkill}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </button>
          </div>

          {/* Skill tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {profile.skills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                <span>{skill.name}</span>
                <span className="text-[10px] text-slate-400">({skill.category})</span>
                <button
                  onClick={() => removeSkill(skill.name)}
                  className="hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Work Experience */}
      {activeTab === 'experience' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={addExperience}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Experience</span>
            </button>
          </div>

          {profile.work_experiences.map((exp, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Position #{idx + 1}</span>
                <button
                  onClick={() => removeExperience(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Company</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Position / Title</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => updateExperience(idx, 'position', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Dates</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Start"
                      value={exp.start_date || ''}
                      onChange={(e) => updateExperience(idx, 'start_date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="text"
                      placeholder="End or Present"
                      value={exp.end_date || ''}
                      onChange={(e) => updateExperience(idx, 'end_date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Location</label>
                  <input
                    type="text"
                    value={exp.location || ''}
                    onChange={(e) => updateExperience(idx, 'location', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Description & Responsibilities</label>
                <textarea
                  rows={2}
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Education */}
      {activeTab === 'education' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={addEducation}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Degree</span>
            </button>
          </div>

          {profile.education.map((edu, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{edu.degree}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {edu.institution} {edu.field_of_study && `• ${edu.field_of_study}`}
                </p>
                <p className="text-[11px] text-slate-400">Completed: {edu.end_date || 'N/A'}</p>
              </div>
              <button
                onClick={() => removeEducation(idx)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Preferences */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Remote Work Preference
            </label>
            <select
              value={profile.remote_preference}
              onChange={(e) => setProfile({ ...profile, remote_preference: e.target.value })}
              className="w-full sm:w-64 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="remote_or_hybrid">Remote or Hybrid (Preferred)</option>
              <option value="remote">Remote Only</option>
              <option value="on_site">On-site Kigali</option>
              <option value="any">Open to Any</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Salary Expectations (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. $50,000 - $75,000 USD"
              value={profile.salary_expectations || ''}
              onChange={(e) => setProfile({ ...profile, salary_expectations: e.target.value })}
              className="w-full sm:w-64 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

