import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  BookOpen,
  Briefcase,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { searchService } from '../../services/phase11.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SearchBar({ onSearch, className = '' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchService.search(query.trim());
        if (res.success) {
          setResults(res.data);
        }
      } catch (err) {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (onSearch) onSearch(val);
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    if (onSearch) onSearch('');
  };

  const handleSelect = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const hasCourses = results?.courses?.length > 0;
  const hasInternships = results?.internships?.length > 0;
  const hasProjects = results?.projects?.length > 0;
  const hasTasks = results?.tasks?.length > 0;
  const hasMessages = results?.messages?.length > 0;
  const totalCount =
    (results?.courses?.length || 0) +
    (results?.internships?.length || 0) +
    (results?.projects?.length || 0) +
    (results?.tasks?.length || 0) +
    (results?.messages?.length || 0);

  return (
    <div ref={containerRef} className={`relative w-full max-w-md ${className}`}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#8CEBFF]/60 absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search courses, internships, tasks..."
          className="w-full pl-10 pr-20 py-2 rounded-xl text-xs sm:text-sm transition-all
          bg-[#1C2948]/50 border border-[#1C2948] text-white placeholder-gray-400
          focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]
          light:bg-white light:border-gray-200 light:text-gray-900 light:placeholder-gray-400"
        />

        <div className="absolute right-2.5 flex items-center space-x-1">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-[#00C8FF] animate-spin" />
          ) : query ? (
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

      {/* Floating Results Popover (FR-42 Grouped by type with no-results state) */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#101735] dark:bg-[#101735] light:bg-white border border-[#1C2948] light:border-gray-200 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto divide-y divide-[#1C2948] light:divide-gray-100 text-xs sm:text-sm">
          {loading && !results ? (
            <div className="p-4 text-center text-gray-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#00C8FF]" />
              <span>Searching across categories...</span>
            </div>
          ) : totalCount === 0 ? (
            <div className="p-6 text-center text-gray-400 light:text-gray-500">
              <p className="font-semibold text-gray-300 light:text-gray-700">No results found</p>
              <p className="text-xs mt-1">No matches found for "{query}". Try a different keyword.</p>
            </div>
          ) : (
            <>
              {/* Courses */}
              {hasCourses && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00C8FF] flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Courses</span>
                  </div>
                  {results.courses.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => handleSelect(user?.role === 'instructor' ? `/instructor/courses` : `/student/courses`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2948]/60 light:hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white light:text-gray-900">{c.code}: {c.title}</p>
                        <p className="text-[11px] text-gray-400 light:text-gray-500 truncate max-w-xs">{c.description}</p>
                      </div>
                      {c.isEnrolled && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Enrolled</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Internships */}
              {hasInternships && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Internships</span>
                  </div>
                  {results.internships.map((i) => (
                    <button
                      key={i._id}
                      onClick={() => handleSelect(`/student/internships`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2948]/60 light:hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white light:text-gray-900">{i.title}</p>
                        <p className="text-[11px] text-gray-400 light:text-gray-500">{i.companyId?.name || 'Partner Company'} • {i.location || 'Remote'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">{i.type}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Personal Projects */}
              {hasProjects && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Projects</span>
                  </div>
                  {results.projects.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => handleSelect(`/student/projects`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2948]/60 light:hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white light:text-gray-900">{p.name}</p>
                        <p className="text-[11px] text-gray-400 light:text-gray-500 truncate max-w-xs">{p.description || 'Personal project'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 capitalize">{p.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Personal Tasks */}
              {hasTasks && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tasks</span>
                  </div>
                  {results.tasks.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => handleSelect(`/student/tasks`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2948]/60 light:hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white light:text-gray-900">{t.title}</p>
                        <p className="text-[11px] text-gray-400 light:text-gray-500 capitalize">Priority: {t.priority}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${t.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {t.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Direct Messages */}
              {hasMessages && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Messages</span>
                  </div>
                  {results.messages.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => handleSelect(`/student/messages`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2948]/60 light:hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-semibold text-white light:text-gray-900 truncate">{m.body}</p>
                      <p className="text-[11px] text-gray-400 light:text-gray-500 mt-0.5">
                        {m.sender?.firstName ? `From ${m.sender.firstName} ${m.sender.lastName || ''}` : 'Message'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
