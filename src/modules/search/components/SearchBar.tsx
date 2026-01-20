'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';
import { debounce } from '@/modules/shared/utils';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Search bar component with debounced input
 */
export function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Search recipes...',
  autoFocus = false,
}: SearchBarProps) {
  const t = useTranslations();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create debounced search function using useMemo to avoid ref access during render
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      onSearch(value);
    }, config.searchDebounceMs),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || t('search.placeholder')}
        className="pl-9 pr-9"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t('search.clearSearch')}</span>
        </Button>
      )}
    </div>
  );
}
