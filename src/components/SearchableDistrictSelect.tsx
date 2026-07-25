'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DistrictOption {
  district_code: string;
  postal_code: string;
  name: string;
  district: string;
  code: string;
}

interface SearchableDistrictSelectProps {
  label: string;
  value: string; // The display name
  onChange: (opt: DistrictOption) => void;
  placeholder?: string;
  filterCity?: string;
  filterJabodetabek?: boolean;
}

const RECENT_SEARCHES_KEY = 'mitraaja_recent_searches';

export default function SearchableDistrictSelect({
  label,
  value,
  onChange,
  placeholder = 'Cari kecamatan / kelurahan...',
  filterCity,
  filterJabodetabek,
}: SearchableDistrictSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<DistrictOption[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const saveRecentSearch = (opt: DistrictOption) => {
    let recent = [...recentSearches];
    recent = recent.filter(r => r.code !== opt.code);
    recent.unshift(opt);
    if (recent.length > 5) recent = recent.slice(0, 5);
    setRecentSearches(recent);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        if (!value) {
          setQuery('');
        } else {
          setQuery(value);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const doSearch = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/districts/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      
      let filtered = data;
      // Client-side filtering enforcement based on user city/jabodetabek
      if (filterJabodetabek) {
        const jaboCities = ['Jakarta', 'Bogor', 'Depok', 'Tangerang', 'Bekasi', 'Kepulauan Seribu'];
        filtered = data.filter((d: any) => jaboCities.some(c => d.name.toLowerCase().includes(c.toLowerCase())));
      } else if (filterCity) {
        filtered = data.filter((d: any) => d.name.toLowerCase().includes(filterCity.toLowerCase()));
      }
      
      setResults(filtered || []);
    } catch (err) {
      console.error('Search API error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val);
    }, 300);
  };

  const handleSelect = (opt: DistrictOption) => {
    saveRecentSearch(opt);
    onChange(opt);
    setQuery(opt.name);
    setOpen(false);
  };

  // Helper to highlight match
  const renderHighlighted = React.useCallback((text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <span key={i} className="bg-yellow-200 text-primary font-bold">{part}</span> 
            : <span key={i}>{part}</span>
        )}
      </>
    );
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all outline-none"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
            if (query.length >= 3 && results.length === 0) doSearch(query);
          }}
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
          search
        </span>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-150 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex flex-col gap-1.5">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : query.length < 3 ? (
            <div className="p-3">
              {recentSearches.length > 0 ? (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 px-2">Pencarian Terakhir</p>
                  <ul>
                    {recentSearches.map(opt => (
                      <li
                        key={`recent-${opt.code}`}
                        className="px-3 py-2.5 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors"
                        onMouseDown={() => handleSelect(opt)}
                      >
                        <span className="material-symbols-outlined text-gray-300 text-[16px]">history</span>
                        <span className="text-[11px] font-medium text-gray-700 leading-tight">{opt.name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4 font-medium">Ketik minimal 3 karakter untuk mencari...</p>
              )}
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map(opt => (
                <li
                  key={opt.code}
                  className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                  onMouseDown={() => handleSelect(opt)}
                >
                  <p className="text-xs font-semibold text-gray-800 leading-tight">
                    {renderHighlighted(opt.name, query)}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">Kode Pos: {opt.postal_code || '-'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-gray-300 text-[32px] mb-2">search_off</span>
              <p className="text-xs text-gray-500 font-medium">Kecamatan tidak ditemukan.</p>
              {filterJabodetabek && <p className="text-[10px] text-rose-500 mt-1">Harus berada dalam Jabodetabek.</p>}
              {filterCity && !filterJabodetabek && <p className="text-[10px] text-rose-500 mt-1">Harus berada dalam kota {filterCity}.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
