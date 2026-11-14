import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { achievementsService } from '../../services/phase11.js';
import {
  Trophy,
  Award,
  Medal,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Shield,
} from 'lucide-react';

export default function StudentAchievementsPage() {
  const [badges, setBadges] = useState([]);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [badgeRes, rankRes] = await Promise.all([
          achievementsService.getBadges(),
          achievementsService.getRankings(),
        ]);

        if (badgeRes.success) setBadges(badgeRes.data || []);
        if (rankRes.success) setRankings(rankRes.data || null);
      } catch (err) {
        setError(err.message || 'Failed to load achievements.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#101735] via-[#141E43] to-[#101735] border border-[#1C2948]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#101735] flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Achievements & Cohort Standing</h1>
            </div>
            <p className="text-xs text-gray-400">
              Celebrate your learning milestones and track your relative performance standing within your student cohort.
            </p>
          </div>

          <Badge variant="warning">FR-17 Student Recognition</Badge>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingState count={3} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Badges Gallery */}
            <div className="lg:col-span-2 space-y-4">
              <DashboardCard
                title="Earned Badges & Milestones"
                subtitle="Milestones awarded based on submissions and course achievements"
                icon={Award}
              >
                {badges.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                    <Medal className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="font-semibold text-gray-300">No Badges Awarded Yet</p>
                    <p>Submit assignments and participate in courses to earn milestone badges.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {badges.map((b) => (
                      <div
                        key={b.id || b.badgeId}
                        className="p-4 rounded-xl bg-[#101735]/60 border border-[#1C2948] hover:border-[#00C8FF]/40 transition-all flex items-start gap-3.5 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <Award className="w-5 h-5" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h4 className="font-bold text-sm text-white group-hover:text-[#00C8FF] transition-colors truncate">
                            {b.title}
                          </h4>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {b.description}
                          </p>
                          <span className="text-[10px] text-gray-500 block pt-1">
                            Awarded: {new Date(b.awardedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </div>

            {/* Right Col: Cohort Rankings Leaderboard */}
            <div className="space-y-4">
              <DashboardCard
                title="Cohort Standing"
                subtitle="Anonymized leaderboard by submission performance (FR-17)"
                icon={TrendingUp}
              >
                {rankings && (
                  <div className="p-3.5 rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/30 text-xs text-white mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Your Rank</span>
                      <span className="text-base font-bold text-[#00C8FF]">
                        {rankings.myRank ? `#${rankings.myRank}` : 'Unranked'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Average Score</span>
                      <span className="text-base font-bold text-emerald-400">
                        {rankings.myAverageScore ? `${rankings.myAverageScore}%` : '—'}
                      </span>
                    </div>
                  </div>
                )}

                {rankings?.leaderboard?.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    No graded assignments recorded yet in your cohort.
                  </div>
                ) : (
                  <div className="divide-y divide-[#1C2948] max-h-[420px] overflow-y-auto pr-1">
                    {rankings?.leaderboard?.map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center justify-between py-2.5 px-2 rounded-lg text-xs transition-all ${
                          entry.isCurrentUser
                            ? 'bg-[#00C8FF]/15 border border-[#00C8FF]/40 font-bold'
                            : 'hover:bg-[#1C2948]/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 text-center font-mono font-bold ${
                              entry.rank === 1
                                ? 'text-amber-400'
                                : entry.rank === 2
                                ? 'text-gray-300'
                                : entry.rank === 3
                                ? 'text-amber-600'
                                : 'text-gray-500'
                            }`}
                          >
                            #{entry.rank}
                          </span>

                          <span className={entry.isCurrentUser ? 'text-[#00C8FF]' : 'text-white'}>
                            {entry.displayName} {entry.isCurrentUser && '(You)'}
                          </span>
                        </div>

                        <span className="font-mono font-bold text-gray-300">
                          {entry.averageScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
