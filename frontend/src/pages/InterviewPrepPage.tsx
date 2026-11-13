import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Send,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
  Brain,
  Briefcase
} from 'lucide-react';
import { api } from '../services/api';
import { Interview, InterviewQuestion, Job } from '../types';

export const InterviewPrepPage: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeInterview, setActiveInterview] = useState<Interview | null>(null);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('');

  // Mock interview state: questionId -> user input & feedback
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});
  const [expandedStar, setExpandedStar] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [intList, jobList] = await Promise.all([
        api.getInterviews(),
        api.getJobs()
      ]);
      setInterviews(intList);
      setJobs(jobList);
      if (intList.length > 0 && !activeInterview) {
        setActiveInterview(intList[0]);
      }
      if (jobList.length > 0 && !selectedJobId) {
        setSelectedJobId(jobList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedJobId) return;
    setGenerating(true);
    try {
      const newInterview = await api.generateInterviewPrep(selectedJobId);
      setInterviews([newInterview, ...interviews]);
      setActiveInterview(newInterview);
    } catch (err: any) {
      alert(err.message || 'Failed to generate interview materials');
    } finally {
      setGenerating(false);
    }
  };

  const handleMockSubmit = async (questionId: string) => {
    const ans = userAnswers[questionId];
    if (!ans || !ans.trim()) {
      alert('Please enter your response before submitting for AI scoring.');
      return;
    }

    setEvaluating(prev => ({ ...prev, [questionId]: true }));
    try {
      const res = await api.submitMockAnswer(questionId, ans);
      // Update question in activeInterview state
      if (activeInterview) {
        const updatedQuestions = activeInterview.questions.map(q => {
          if (q.id === questionId) {
            return {
              ...q,
              user_answer: ans,
              score: res.score,
              ai_feedback: res.ai_feedback
            };
          }
          return q;
        });
        setActiveInterview({ ...activeInterview, questions: updatedQuestions });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate answer');
    } finally {
      setEvaluating(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const toggleStar = (id: string) => {
    setExpandedStar(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredQuestions = activeInterview?.questions.filter(q => {
    if (!categoryFilter) return true;
    return q.category.toLowerCase() === categoryFilter.toLowerCase();
  }) || [];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI Interview Preparation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Grounded Technical, Behavioral (STAR), and Leadership questions with interactive AI mock scoring.
          </p>
        </div>

        {/* Generate Prep Trigger */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.company})
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedJobId}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Synthesizing...' : 'Generate Prep'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Loading interview sessions...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No interview sessions generated yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Select a target vacancy above and click "Generate Prep" to build customized questions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sessions List (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Interview Packages ({interviews.length})
            </h3>
            {interviews.map((intv) => {
              const isSelected = activeInterview?.id === intv.id;
              return (
                <div
                  key={intv.id}
                  onClick={() => setActiveInterview(intv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      {intv.interview_type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(intv.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {intv.job?.title || 'Target Role'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{intv.job?.company || 'Employer'}</p>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    {intv.questions.length} questions included
                  </p>
                </div>
              );
            })}
          </div>

          {/* Active Interview Questions & Mock Mode (Right 8 cols) */}
          {activeInterview && (
            <div className="lg:col-span-8 space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto text-xs pb-1">
                {[
                  { id: '', label: 'All Questions' },
                  { id: 'technical', label: 'Technical' },
                  { id: 'behavioral', label: 'Behavioral (STAR)' },
                  { id: 'leadership', label: 'Leadership' },
                  { id: 'situational', label: 'Situational' },
                  { id: 'hr', label: 'HR / Culture' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                      categoryFilter === cat.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Questions Stream */}
              <div className="space-y-4">
                {filteredQuestions.map((q, idx) => {
                  const isEvaluating = evaluating[q.id];
                  const showStar = expandedStar[q.id];
                  return (
                    <div
                      key={q.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {q.category}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed mt-1">
                            {q.question}
                          </h4>
                        </div>

                        {q.score !== null && q.score !== undefined && (
                          <div className="text-right shrink-0">
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              {q.score.toFixed(0)}/100
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Suggested Answer (STAR Method) Accordion */}
                      {q.suggested_answer_star && (
                        <div>
                          <button
                            onClick={() => toggleStar(q.id)}
                            className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            <span>{showStar ? 'Hide Suggested STAR Answer' : 'View Grounded STAR Response'}</span>
                            {showStar ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {showStar && (
                            <div className="mt-2.5 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                              {q.suggested_answer_star}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mock Interview Response Input */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Mock Interview Answer (Type your practice response)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Type how you would respond using the STAR method (Situation, Task, Action, Result)..."
                          value={userAnswers[q.id] !== undefined ? userAnswers[q.id] : (q.user_answer || '')}
                          onChange={(e) => setUserAnswers({ ...userAnswers, [q.id]: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white leading-relaxed"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleMockSubmit(q.id)}
                            disabled={isEvaluating}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isEvaluating ? 'Evaluating...' : 'Submit for AI Feedback'}</span>
                          </button>
                        </div>
                      </div>

                      {/* AI Feedback Banner */}
                      {q.ai_feedback && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>AI Evaluator Feedback:</span>
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {q.ai_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

