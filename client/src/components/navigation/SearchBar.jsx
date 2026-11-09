import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ onSearch, className = '' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  // Keyboard shortcut Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearch) onSearch(val);
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) onSearch('');
  };

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#8CEBFF]/60 absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search anything..."
          className="w-full pl-10 pr-20 py-2 rounded-xl text-xs sm:text-sm transition-all
          bg-[#1C2948]/50 border border-[#1C2948] text-white placeholder-gray-400
          focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]
          light:bg-white light:border-gray-200 light:text-gray-900 light:placeholder-gray-400"
        />

        <div className="absolute right-2.5 flex items-center space-x-1">
          {query ? (
            <button
              onClick={handleClear}
              className="p-1 rounded-md text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#101735]/80 text-[#8CEBFF] border border-[#1C2948] light:bg-gray-100 light:text-gray-600">
              Ctrl + K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
