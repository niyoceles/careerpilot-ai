import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UserCheck,
  Briefcase,
  Sparkles,
  Kanban,
  Files,
  HelpCircle,
  Bot,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'My CV', path: '/cv', icon: FileText },
  { name: 'Professional Profile', path: '/profile', icon: UserCheck },
  { name: 'Find Jobs', path: '/jobs', icon: Briefcase },
  { name: 'Job Matches', path: '/matches', icon: Sparkles },
  { name: 'Applications', path: '/applications', icon: Kanban },
  { name: 'Documents', path: '/documents', icon: Files },
  { name: 'Interview Prep', path: '/interviews', icon: HelpCircle },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [aiStatus, setAiStatus] = useState<{ is_connected: boolean; configured_model: string; provider: string } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    api.checkAIHealth().then(setAiStatus).catch(() => {
      setAiStatus({ is_connected: false, configured_model: 'qwen3', provider: 'ollama' });
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & App title */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  CareerPilot
                </span>
                <span className="text-xs ml-1 px-1.5 py-0.5 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  AI
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {/* AI Connection Status pill */}
          <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-[110px]">
                {aiStatus?.configured_model || 'qwen3'}
              </span>
            </div>
            {aiStatus?.is_connected ? (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
              </span>
            ) : (
              <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium" title="Ollama running with fallback engine">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Active
              </span>
            )}
          </div>

          {/* User profile & logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{user?.full_name || 'Candidate'}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                AI Career Copilot • Rwanda & Global Remote
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Dark/Light mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <NavLink
              to="/ai-assistant"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-sm"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI Assistant</span>
            </NavLink>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

