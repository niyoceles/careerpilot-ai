import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Bell,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Key
} from 'lucide-react';
import { api } from '../services/api';
import { UserSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setMessage('Recurring discovery and AI matching preferences saved successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure recurring scheduled job searches, matching score thresholds, and target regional locations.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Recurring Search Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Scheduled Job Discovery</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Discovery Frequency
              </label>
              <select
                value={settings.recurring_search_frequency}
                onChange={(e) => setSettings({ ...settings, recurring_search_frequency: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="daily">Daily Discovery Cycle (Every 12h)</option>
                <option value="weekly">Weekly Digest</option>
                <option value="manual">Manual Trigger Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Minimum Match Threshold
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="5"
                  value={settings.min_match_threshold}
                  onChange={(e) => setSettings({ ...settings, min_match_threshold: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs font-bold w-12 text-right text-indigo-600 dark:text-indigo-400">
                  {settings.min_match_threshold}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Remote Preferences */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Target Locations</h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Active Regional Feeds
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Rwanda', 'Kigali', 'East Africa', 'Remote Worldwide'].map((loc) => (
                <span
                  key={loc}
                  className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                >
                  ✓ {loc}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="remote_only"
              checked={settings.remote_only}
              onChange={(e) => setSettings({ ...settings, remote_only: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="remote_only" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Only consider 100% remote job opportunities
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto_match"
              checked={settings.auto_matching_enabled}
              onChange={(e) => setSettings({ ...settings, auto_matching_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="auto_match" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Automatically evaluate newly discovered jobs against my master profile
            </label>
          </div>
        </div>

        {/* AI Intelligence Provider Configuration */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Engine & Model Provider</h3>
              <p className="text-xs text-slate-500">Configure your LLM for dynamic job matching, CV tailoring, and career advice.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                AI Provider
              </label>
              <select
                value={settings.ai_provider || 'ollama'}
                onChange={(e) => {
                  const prov = e.target.value;
                  let defModel = 'qwen3';
                  if (prov === 'gemini') defModel = 'gemini-2.0-flash';
                  if (prov === 'openai') defModel = 'gpt-4o';
                  if (prov === 'groq') defModel = 'llama-3.3-70b-versatile';
                  setSettings({ ...settings, ai_provider: prov, ai_model: defModel });
                }}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ollama">Ollama (Local Inference - Default)</option>
                <option value="gemini">Google Gemini (Cloud API)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="groq">Groq (Ultra-Fast Cloud Llama/Qwen)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={settings.ai_model || ''}
                onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                placeholder="e.g. qwen3, gemini-2.0-flash, gpt-4o"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {settings.ai_provider !== 'ollama' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>API Key for {settings.ai_provider?.toUpperCase()}</span>
              </label>
              <input
                type="password"
                value={settings.ai_api_key || ''}
                onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                placeholder={`Enter your ${settings.ai_provider} API key`}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Stored securely for your personal user session. Cloud requests are made directly to the provider adapter.
              </p>
            </div>
          )}

          {settings.ai_provider === 'ollama' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">Local Ollama Setup: </span>
              Ensure Ollama is running (`ollama serve`) and the default model is pulled (`ollama run {settings.ai_model || 'qwen3'}`).
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

