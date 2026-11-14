import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl border transition-all duration-200 
      bg-[#1C2948]/60 border-[#1C2948] text-[#8CEBFF] hover:border-[#00C8FF] hover:shadow-glow-cyan-sm
      light:bg-white light:border-gray-200 light:text-gray-700 light:hover:border-[#00C8FF] ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4 text-[#8CEBFF]" /> : <Moon className="w-4 h-4 text-gray-700" />}
    </button>
  );
}
