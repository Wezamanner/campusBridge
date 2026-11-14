import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Code2, Trophy, Star } from 'lucide-react';

export default function WelcomeBanner({ quote, tags, className = '' }) {
  const { user } = useAuth();
  const userName = user?.name ? user.name.split(' ')[0] : 'Scholar';

  const defaultQuote = '“Dream big, code better, achieve more.”';
  const defaultTags = [
    { label: 'Developer', icon: Code2 },
    { label: 'Competitive Programmer', icon: Trophy },
    { label: 'Tech Enthusiast', icon: Star },
  ];

  const activeTags = tags || defaultTags;

  return (
    <div
      className={`relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-[#00C8FF]/30
      bg-gradient-to-r from-[#101735] via-[#1C2948] to-[#101735] shadow-2xl shadow-[#00C8FF]/10 ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#00C8FF]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-4 max-w-xl">
          {/* Greeting */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Welcome back,</span>
              <span className="text-[#00C8FF]">{userName}!</span>
              <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#8CEBFF]/90 font-medium italic pl-1 border-l-2 border-[#00C8FF]">
              {quote || defaultQuote}
            </p>
          </div>

          {/* Role / Skill Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activeTags.map((tag, idx) => {
              const Icon = tag.icon;
              return (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold
                  bg-[#101735]/80 text-[#8CEBFF] border border-[#1C2948] hover:border-[#00C8FF]/50 transition-colors"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-[#00C8FF]" />}
                  <span>{tag.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Right: Logo */}
        <div className="hidden md:flex items-center justify-center relative w-44 h-44 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-[#00C8FF]/30 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-[#8CEBFF]/20" />
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#00C8FF]/40 shadow-glow-cyan flex items-center justify-center">
            <img
              src="/brolf-tech-logo.jpg"
              alt="Brolf Tech"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
