import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toBe('base included');
  });

  it('merges tailwind classes with deduplication', () => {
    // twMerge should handle conflicting tailwind classes
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('handles array inputs', () => {
    const result = cn(['class1', 'class2']);
    expect(result).toBe('class1 class2');
  });

  it('handles object inputs', () => {
    const result = cn({ 'class1': true, 'class2': false, 'class3': true });
    expect(result).toBe('class1 class3');
  });

  it('handles mixed inputs', () => {
    const result = cn('base', { 'active': true }, ['text-lg', 'font-bold']);
    expect(result).toBe('base active text-lg font-bold');
  });

  it('handles undefined and null', () => {
    const result = cn('class1', undefined, null, 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
