import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Loader2, MapPin } from 'lucide-react';
import { dbSearchPostcodeDistricts } from '@laundelle/api-client';
import { extractOutwardCode } from '@laundelle/utils';


interface PostcodeMultiSelectProps {
  value: string;
  onChange: (newValue: string) => void;
  required?: boolean;
  placeholder?: string;
}

export const PostcodeMultiSelect: React.FC<PostcodeMultiSelectProps> = ({
  value,
  onChange,
  required = false,
  placeholder = "Type postcode district (e.g. PR1, M1, BD2)..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse comma-separated value into unique array of selected outward codes
  const selectedList = (value || '')
    .split(',')
    .map((p) => extractOutwardCode(p).toUpperCase())
    .filter(Boolean);
  
  const selectedSet = new Set(selectedList);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced API search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    const timer = setTimeout(async () => {
      try {
        const data = await dbSearchPostcodeDistricts(trimmed);
        // Normalize results to outward codes and deduplicate
        const normalizedSet = new Set<string>();
        (data || []).forEach((item) => {
          const out = extractOutwardCode(item);
          if (out) normalizedSet.add(out.toUpperCase());
        });
        
        // Also if trimmed input looks like an outward code prefix, ensure it's included
        const typedOut = extractOutwardCode(trimmed).toUpperCase();
        if (typedOut && typedOut.length >= 2) {
          normalizedSet.add(typedOut);
        }

        setResults(Array.from(normalizedSet));
      } catch (err) {
        console.error('Error in postcode search component:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateSelected = (newList: string[]) => {
    // Deduplicate and trim
    const cleanList = Array.from(new Set(newList.map((s) => extractOutwardCode(s).toUpperCase()).filter(Boolean)));
    onChange(cleanList.join(', '));
  };

  const addDistrict = (district: string) => {
    const cleanDist = extractOutwardCode(district).toUpperCase();
    if (!cleanDist) return;

    if (!selectedSet.has(cleanDist)) {
      updateSelected([...selectedList, cleanDist]);
    }
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeDistrict = (districtToRemove: string) => {
    const target = districtToRemove.toUpperCase();
    const updated = selectedList.filter((d) => d !== target);
    updateSelected(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (searchQuery.trim()) {
        addDistrict(searchQuery.trim());
      }
    } else if (e.key === 'Backspace' && !searchQuery && selectedList.length > 0) {
      removeDistrict(selectedList[selectedList.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for HTML5 form required validation */}
      <input
        type="text"
        tabIndex={-1}
        required={required && selectedList.length === 0}
        value={value}
        onChange={() => {}}
        className="opacity-0 absolute pointer-events-none h-0 w-0"
      />

      <div
        onClick={() => inputRef.current?.focus()}
        className="w-full min-h-[46px] p-2 bg-gray-50 border border-gray-300 rounded-xl font-semibold focus-within:ring-2 focus-within:ring-[#03045E] focus-within:border-transparent focus-within:bg-white transition-all flex flex-wrap items-center gap-1.5 cursor-text"
      >
        {/* Chips / Tags for Selected Postcode Districts */}
        {selectedList.map((district) => (
          <span
            key={district}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-[#03045E] border border-indigo-200 rounded-lg text-xs font-bold shadow-2xs group animate-in fade-in zoom-in-95 duration-100"
          >
            <MapPin className="w-3 h-3 text-[#03045E]" />
            <span>{district}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeDistrict(district);
              }}
              className="p-0.5 hover:bg-indigo-200/70 rounded-full text-indigo-700 hover:text-red-600 transition-colors cursor-pointer"
              title={`Remove ${district}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input box */}
        <div className="flex-1 flex items-center min-w-[140px]">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedList.length === 0 ? placeholder : "Add more (e.g. M1)..."}
            className="w-full bg-transparent border-0 focus:outline-hidden text-sm font-semibold text-gray-800 placeholder:text-gray-400 uppercase"
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin ml-1 shrink-0" />}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && searchQuery.trim() !== '' && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold px-3">
            <span>Matching Postcode Districts</span>
            {loading && <span className="flex items-center gap-1 text-indigo-600"><Loader2 className="w-3 h-3 animate-spin" /> Searching API...</span>}
          </div>

          <div className="divide-y divide-gray-50">
            {results.length > 0 ? (
              results.map((district) => {
                const isSelected = selectedSet.has(district);
                return (
                  <button
                    key={district}
                    type="button"
                    disabled={isSelected}
                    onClick={() => addDistrict(district)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-indigo-50/80 text-gray-800 font-semibold cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-[#03045E]'
                      }`}>
                        {district.slice(0, 3)}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-900">{district}</span>
                        <span className="text-xs text-gray-500 ml-2">District</span>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 hover:underline">
                        + Select
                      </span>
                    )}
                  </button>
                );
              })
            ) : !loading ? (
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500 mb-2">No matching UK districts found in API search.</p>
                <button
                  type="button"
                  onClick={() => addDistrict(searchQuery.trim())}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  Add "{extractOutwardCode(searchQuery).toUpperCase()}" anyway
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
