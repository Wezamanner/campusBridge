import React, { useState } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { aiService } from '../../services/phase11.js';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  Briefcase,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

export default function StudentAIAssistantPage() {
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'ask' | 'matches'

  // Tab 1: Study Plan State
  const [hours, setHours] = useState(3);
  const [planData, setPlanData] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Tab 2: Ask Q&A State
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState(null);

  // Tab 3: Internship Matches State
  const [matchesData, setMatchesData] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState(null);

  // Handlers
  const handleGeneratePlan = async () => {
    try {
      setPlanLoading(true);
      setPlanError(null);
      const res = await aiService.generateStudyPlan(hours);
      if (res.success) {
        setPlanData(res.data);
      }
    } catch (err) {
      setPlanError(err.message || 'Failed to generate study plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question.trim();
    try {
      setQaLoading(true);
      setQaError(null);
      setQuestion('');
      const res = await aiService.ask(currentQuestion);
      if (res.success) {
        setQaHistory((prev) => [
          ...prev,
          {
            question: currentQuestion,
            answer: res.data.answer,
            guidanceNotice: res.data.guidanceNotice,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setQaError(err.message || 'Failed to generate answer.');
    } finally {
      setQaLoading(false);
    }
  };

  const handleLoadMatches = async () => {
    try {
      setMatchesLoading(true);
      setMatchesError(null);
      const res = await aiService.getInternshipMatches();
      if (res.success) {
        setMatchesData(res.data);
      }
    } catch (err) {
      setMatchesError(err.message || 'Failed to fetch internship matches.');
    } finally {
      setMatchesLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#101735] via-[#141E43] to-[#101735] border border-[#1C2948]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C8FF] to-purple-500 text-white flex items-center justify-center shadow-glow-cyan-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Learning Assistant</h1>
            </div>
            <p className="text-xs text-gray-400">
              Personalized study plan generator, educational concept explanations, and internship skill matching.
            </p>
          </div>

          <Badge variant="info">CON-05 Educational Support</Badge>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#1C2948] gap-4">
          <button
            onClick={() => setActiveTab('plan')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'plan'
                ? 'border-[#00C8FF] text-[#00C8FF]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Study Plan Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('ask')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'ask'
                ? 'border-[#00C8FF] text-[#00C8FF]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Educational Q&A</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('matches');
              if (!matchesData) handleLoadMatches();
            }}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'matches'
                ? 'border-[#00C8FF] text-[#00C8FF]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Internship Skill Matching</span>
          </button>
        </div>

        {/* Tab 1: Study Plan Generator */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <DashboardCard>
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/30 text-xs text-[#8CEBFF] flex items-center gap-2.5">
                  <Info className="w-4 h-4 flex-shrink-0 text-[#00C8FF]" />
                  <span>This study plan is AI-generated for guidance only (SRS CON-05).</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="block text-xs font-semibold text-gray-300">
                      Available Study Hours per Day: <span className="text-[#00C8FF] font-bold">{hours} hrs</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={hours}
                      onChange={(e) => setHours(parseInt(e.target.value, 10))}
                      className="w-full accent-[#00C8FF]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>1 hr (Light)</span>
                      <span>6 hrs (Moderate)</span>
                      <span>12 hrs (Intensive)</span>
                    </div>
                  </div>

                  <Button icon={Sparkles} isLoading={planLoading} onClick={handleGeneratePlan}>
                    Generate Plan
                  </Button>
                </div>
              </div>
            </DashboardCard>

            {planError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{planError}</span>
              </div>
            )}

            {planData && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">
                  Synthesized Study Schedule ({planData.plan?.length || 0} Blocks)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {planData.plan.map((item, idx) => (
                    <DashboardCard key={idx} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#00C8FF]">{item.day}</span>
                        <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.allocatedHours} hrs
                        </span>
                      </div>

                      <div className="pt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#1C2948] text-white">
                          {item.courseCode}
                        </span>
                      </div>

                      <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                        {item.topics.map((t, tidx) => (
                          <li key={tidx} className="line-clamp-2">{t}</li>
                        ))}
                      </ul>

                      {item.assignment && (
                        <div className="pt-2 border-t border-[#1C2948] text-xs text-gray-400">
                          <span className="font-semibold text-gray-300">Assignment Focus: </span>
                          <span className="text-amber-400">{item.assignment}</span>
                        </div>
                      )}
                    </DashboardCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Educational Q&A */}
        {activeTab === 'ask' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/30 text-xs text-[#8CEBFF] flex items-center gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 text-[#00C8FF]" />
              <span>AI responses are for educational support. Refer to instructor lectures for definitive criteria.</span>
            </div>

            <DashboardCard className="min-h-[300px] flex flex-col justify-between">
              <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
                {qaHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
                    <p className="font-semibold text-gray-300">Ask any concept question</p>
                    <p>Examples: "What is JWT authentication?", "How does submission grading recalculate progress?"</p>
                  </div>
                ) : (
                  qaHistory.map((item, idx) => (
                    <div key={idx} className="space-y-2 text-xs">
                      {/* User Query */}
                      <div className="flex justify-end">
                        <div className="p-3 rounded-2xl rounded-tr-none bg-[#00C8FF]/15 border border-[#00C8FF]/30 text-white max-w-lg">
                          <p className="font-semibold">{item.question}</p>
                          <span className="text-[10px] text-gray-400 block text-right mt-1">{item.time}</span>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex justify-start">
                        <div className="p-3.5 rounded-2xl rounded-tl-none bg-[#1C2948]/70 border border-[#1C2948] text-gray-200 max-w-xl space-y-1.5">
                          <p className="leading-relaxed">{item.answer}</p>
                          <span className="text-[10px] text-gray-500 italic block border-t border-[#1C2948] pt-1">
                            {item.guidanceNotice}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAskQuestion} className="flex gap-2 pt-4 border-t border-[#1C2948] mt-4">
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a coursework or conceptual question..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white text-xs focus:outline-none focus:border-[#00C8FF]"
                />
                <Button type="submit" isLoading={qaLoading} icon={Send}>
                  Send
                </Button>
              </form>
            </DashboardCard>
          </div>
        )}

        {/* Tab 3: Internship Skill Matching */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/30 text-xs text-[#8CEBFF] flex items-center gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 text-[#00C8FF]" />
              <span>Skill match scores are heuristic indicators based on profile keywords (CON-05).</span>
            </div>

            {matchesLoading ? (
              <LoadingState count={3} />
            ) : matchesError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{matchesError}</span>
              </div>
            ) : !matchesData || matchesData.matches.length === 0 ? (
              <DashboardCard>
                <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                  <Briefcase className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="font-semibold text-gray-300">No open internships currently available</p>
                  <Button onClick={handleLoadMatches}>Refresh Matches</Button>
                </div>
              </DashboardCard>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  Analyzed against <span className="text-white font-bold">{matchesData.studentSkillCount}</span> skill(s) on your Student Profile.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchesData.matches.map((item) => (
                    <DashboardCard key={item.internshipId} className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-white">{item.title}</h4>
                          <p className="text-xs text-gray-400">{item.companyName} • {item.location}</p>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-bold font-mono ${
                            item.matchPercentage >= 75
                              ? 'text-emerald-400'
                              : item.matchPercentage >= 50
                              ? 'text-[#00C8FF]'
                              : 'text-amber-400'
                          }`}>
                            {item.matchPercentage}%
                          </span>
                          <span className="block text-[10px] text-gray-400">Match</span>
                        </div>
                      </div>

                      {/* Matched skills */}
                      {item.matchedSkills.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Matched Skills</span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.matchedSkills.map((s) => (
                              <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing skills */}
                      {item.missingSkills.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Missing / Recommended</span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.missingSkills.map((s) => (
                              <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-400">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </DashboardCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
