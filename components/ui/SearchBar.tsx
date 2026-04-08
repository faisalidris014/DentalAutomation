'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: { id: string; label: string; sublabel?: string }[];
  onSelect?: (id: string) => void;
  icon?: ReactNode;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChange,
  suggestions = [],
  onSelect,
  icon,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showSuggestions = focused && value.length > 0 && suggestions.length > 0;

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <div className={`search-input-wrap ${focused ? 'search-input-wrap--focused' : ''}`}>
        <span className="search-icon">
          {icon || <Search size={16} />}
        </span>
        <input
          className="search-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="search-dropdown">
          {suggestions.map(s => (
            <button
              key={s.id}
              className="search-suggestion"
              onClick={() => {
                onSelect?.(s.id);
                setFocused(false);
              }}
            >
              <span className="search-suggestion__label">{s.label}</span>
              {s.sublabel && <span className="search-suggestion__sub">{s.sublabel}</span>}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .search-wrapper {
          position: relative;
          width: 100%;
        }
        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px var(--space-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .search-input-wrap--focused {
          border-color: var(--border-accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .search-icon {
          color: var(--text-tertiary);
          display: flex;
          flex-shrink: 0;
        }
        .search-input {
          flex: 1;
          font-size: var(--text-base);
          color: var(--text-primary);
        }
        .search-input::placeholder {
          color: var(--text-muted);
        }
        .search-clear {
          display: flex;
          align-items: center;
          color: var(--text-tertiary);
          padding: 2px;
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
        }
        .search-clear:hover {
          color: var(--text-primary);
        }
        .search-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 100;
          max-height: 280px;
          overflow-y: auto;
          animation: fadeIn 0.15s ease;
        }
        .search-suggestion {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
          padding: 10px var(--space-md);
          text-align: left;
          transition: background var(--transition-fast);
        }
        .search-suggestion:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .search-suggestion__label {
          font-size: var(--text-base);
          color: var(--text-primary);
        }
        .search-suggestion__sub {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
