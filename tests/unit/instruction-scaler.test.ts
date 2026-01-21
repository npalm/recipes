/**
 * Instruction Scaler Service Tests
 */

import { describe, test, expect } from 'vitest';
import {
  parseInstructionQuantities,
  scaleInstructionText,
  parseInstructionSegments,
} from '@/modules/instruction/services/scaler';

describe('parseInstructionQuantities', () => {
  describe('basic parsing', () => {
    test('parses simple quantity with unit', () => {
      const result = parseInstructionQuantities('Add {{50ml}} water');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        original: '{{50ml}}',
        quantity: 50,
        unit: 'ml',
        shouldScale: true,
      });
    });

    test('parses quantity with space between number and unit', () => {
      const result = parseInstructionQuantities('Use {{2 cups}} flour');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        quantity: 2,
        unit: 'cups',
        shouldScale: true,
      });
    });

    test('parses fraction', () => {
      const result = parseInstructionQuantities('Add {{1/2 cup}} sugar');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        quantity: 0.5,
        unit: 'cup',
        shouldScale: true,
      });
    });

    test('parses mixed fraction', () => {
      const result = parseInstructionQuantities('Use {{1 1/2 tbsp}} oil');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        quantity: 1.5,
        unit: 'tbsp',
        shouldScale: true,
      });
    });

    test('parses range', () => {
      const result = parseInstructionQuantities('Add {{10-15ml}} vinegar');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        quantity: 10,
        quantityMax: 15,
        unit: 'ml',
        shouldScale: true,
      });
    });

    test('parses decimal', () => {
      const result = parseInstructionQuantities('Add {{2.5g}} salt');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        quantity: 2.5,
        unit: 'g',
        shouldScale: true,
      });
    });

    test('parses multiple quantities in one instruction', () => {
      const result = parseInstructionQuantities('Add {{50ml}} water and {{10g}} sugar');
      
      expect(result).toHaveLength(2);
      expect(result[0].quantity).toBe(50);
      expect(result[0].unit).toBe('ml');
      expect(result[1].quantity).toBe(10);
      expect(result[1].unit).toBe('g');
    });
  });

  describe('unit detection - scalable', () => {
    test('identifies volume units', () => {
      const tests = ['ml', 'L', 'cups', 'cup', 'tbsp', 'tsp', 'oz'];
      
      tests.forEach((unit) => {
        const result = parseInstructionQuantities(`Add {{10 ${unit}}} liquid`);
        expect(result[0].shouldScale).toBe(true);
      });
    });

    test('identifies weight units', () => {
      const tests = ['g', 'kg', 'oz', 'lb', 'lbs'];
      
      tests.forEach((unit) => {
        const result = parseInstructionQuantities(`Add {{100 ${unit}}} ingredient`);
        expect(result[0].shouldScale).toBe(true);
      });
    });
  });

  describe('unit detection - non-scalable', () => {
    test('identifies time units as non-scalable', () => {
      const tests = ['minutes', 'minute', 'min', 'hours', 'hour', 'hr', 'seconds', 'sec'];
      
      tests.forEach((unit) => {
        const result = parseInstructionQuantities(`Cook for {{20 ${unit}}}`);
        expect(result[0].shouldScale).toBe(false);
      });
    });

    test('identifies temperature as non-scalable', () => {
      const tests = ['°C', '°F', 'C', 'F', 'celsius', 'fahrenheit'];
      
      tests.forEach((unit) => {
        const result = parseInstructionQuantities(`Heat to {{180 ${unit}}}`);
        expect(result[0].shouldScale).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty string', () => {
      const result = parseInstructionQuantities('');
      expect(result).toHaveLength(0);
    });

    test('handles text without annotations', () => {
      const result = parseInstructionQuantities('Add 50ml water');
      expect(result).toHaveLength(0);
    });

    test('handles malformed annotation - empty', () => {
      const result = parseInstructionQuantities('Add {{}} water');
      expect(result).toHaveLength(0);
    });

    test('handles malformed annotation - invalid characters', () => {
      const result = parseInstructionQuantities('Add {{invalid}} water');
      expect(result).toHaveLength(0);
    });

    test('handles annotation without unit', () => {
      const result = parseInstructionQuantities('Add {{50}} of something');
      
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(50);
      expect(result[0].unit).toBe('');
      expect(result[0].shouldScale).toBe(true); // No unit = scalable by default
    });

    test('handles nested braces', () => {
      // Should not parse nested braces
      const result = parseInstructionQuantities('Add {{{{50ml}}}} water');
      expect(result).toHaveLength(0);
    });
  });

  describe('position tracking', () => {
    test('tracks start and end positions correctly', () => {
      const text = 'First add {{50ml}} water then {{10g}} sugar';
      const result = parseInstructionQuantities(text);
      
      expect(result).toHaveLength(2);
      expect(result[0].startIndex).toBe(10);
      expect(result[0].endIndex).toBe(18);
      expect(result[1].startIndex).toBe(30);
      expect(result[1].endIndex).toBe(37);
    });
  });
});

describe('scaleInstructionText', () => {
  describe('scaling logic', () => {
    test('scales down: 4 → 2 servings', () => {
      const result = scaleInstructionText('Add {{100ml}} water', 4, 2);
      expect(result).toBe('Add 50 ml water');
    });

    test('scales up: 4 → 8 servings', () => {
      const result = scaleInstructionText('Add {{50g}} flour', 4, 8);
      expect(result).toBe('Add 100 g flour');
    });

    test('scales fraction: 1/2 → 1/4', () => {
      const result = scaleInstructionText('Use {{1/2 cup}} sugar', 4, 2);
      expect(result).toBe('Use 1/4 cup sugar');
    });

    test('scales mixed fraction', () => {
      const result = scaleInstructionText('Add {{1 1/2 tbsp}} oil', 4, 8);
      expect(result).toBe('Add 3 tbsp oil');
    });

    test('scales range proportionally', () => {
      const result = scaleInstructionText('Add {{10-15ml}} vinegar', 4, 2);
      expect(result).toBe('Add 5-7 1/2 ml vinegar');
    });

    test('scales decimal values', () => {
      const result = scaleInstructionText('Add {{2.5g}} salt', 4, 2);
      expect(result).toBe('Add 1 1/4 g salt');
    });

    test('handles no scaling (1:1 ratio)', () => {
      const result = scaleInstructionText('Add {{100ml}} water', 4, 4);
      expect(result).toBe('Add 100 ml water');
    });

    test('scales by fractional ratio: 4 → 6', () => {
      const result = scaleInstructionText('Add {{100ml}} water', 4, 6);
      expect(result).toBe('Add 150 ml water');
    });
  });

  describe('non-scalable units', () => {
    test('does NOT scale time', () => {
      const result = scaleInstructionText('Cook for {{20 minutes}}', 4, 2);
      expect(result).toBe('Cook for 20 minutes');
    });

    test('does NOT scale temperature', () => {
      const result = scaleInstructionText('Heat to {{180°C}}', 4, 2);
      expect(result).toBe('Heat to 180°C');
    });

    test('does NOT scale hours', () => {
      const result = scaleInstructionText('Marinate for {{2 hours}}', 4, 8);
      expect(result).toBe('Marinate for 2 hours');
    });
  });

  describe('multiple quantities', () => {
    test('scales multiple quantities in same instruction', () => {
      const result = scaleInstructionText('Add {{50ml}} water and {{10g}} sugar', 4, 2);
      expect(result).toBe('Add 25 ml water and 5 g sugar');
    });

    test('handles mixed scalable and non-scalable', () => {
      const result = scaleInstructionText(
        'Add {{100ml}} water and cook for {{20 minutes}}',
        4,
        2
      );
      expect(result).toBe('Add 50 ml water and cook for 20 minutes');
    });
  });

  describe('edge cases', () => {
    test('handles text without annotations', () => {
      const result = scaleInstructionText('Just regular text', 4, 2);
      expect(result).toBe('Just regular text');
    });

    test('preserves surrounding text and punctuation', () => {
      const result = scaleInstructionText('First, add {{50ml}} water. Then stir.', 4, 2);
      expect(result).toBe('First, add 25 ml water. Then stir.');
    });

    test('handles annotation at start', () => {
      const result = scaleInstructionText('{{100ml}} water goes first', 4, 2);
      expect(result).toBe('50 ml water goes first');
    });

    test('handles annotation at end', () => {
      const result = scaleInstructionText('Finally add {{50g}} sugar', 4, 2);
      expect(result).toBe('Finally add 25 g sugar');
    });

    test('handles multiple spaces', () => {
      const result = scaleInstructionText('Add  {{50ml}}  water', 4, 2);
      expect(result).toBe('Add  25 ml  water');
    });
  });

  describe('display formatting', () => {
    test('formats as fractions when appropriate', () => {
      const result = scaleInstructionText('Add {{1 cup}} sugar', 4, 2);
      expect(result).toBe('Add 1/2 cup sugar');
    });

    test('rounds to cooking precision', () => {
      const result = scaleInstructionText('Add {{100g}} flour', 3, 2);
      // 100 * (2/3) = 66.66... should round to 67g (nearest integer)
      expect(result).toBe('Add 67 g flour');
    });
  });
});

describe('parseInstructionSegments', () => {
  test('returns single segment when no scaling', () => {
    const original = 'Add {{50ml}} water';
    const scaled = scaleInstructionText(original, 4, 4);
    const segments = parseInstructionSegments(original, scaled, 4, 4);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].isScaled).toBe(false);
  });

  test('identifies scaled segments', () => {
    const original = 'Add {{50ml}} water';
    const scaled = scaleInstructionText(original, 4, 2);
    const segments = parseInstructionSegments(original, scaled, 4, 2);
    
    // Should have 3 segments: "Add ", "25 ml", " water"
    expect(segments.length).toBeGreaterThan(1);
    
    // Find the scaled segment
    const scaledSegment = segments.find(s => s.isScaled);
    expect(scaledSegment).toBeDefined();
    expect(scaledSegment?.text).toBe('25 ml');
  });

  test('handles multiple scaled quantities', () => {
    const original = 'Add {{50ml}} water and {{10g}} sugar';
    const scaled = scaleInstructionText(original, 4, 2);
    const segments = parseInstructionSegments(original, scaled, 4, 2);
    
    const scaledSegments = segments.filter(s => s.isScaled);
    expect(scaledSegments).toHaveLength(2);
  });

  test('marks non-scalable units as not scaled', () => {
    const original = 'Cook {{20 minutes}} at {{180°C}}';
    const scaled = scaleInstructionText(original, 4, 2);
    const segments = parseInstructionSegments(original, scaled, 4, 2);
    
    // None should be marked as scaled (time + temp)
    const scaledSegments = segments.filter(s => s.isScaled);
    expect(scaledSegments).toHaveLength(0);
  });
});

describe('real-world examples', () => {
  test('scallops recipe - soy sauce', () => {
    const instruction = 'Stir in {{10ml}} of soy sauce and the chopped thyme.';
    const result = scaleInstructionText(instruction, 4, 2);
    
    expect(result).toBe('Stir in 5 ml of soy sauce and the chopped thyme.');
  });

  test('veal recipe - brine', () => {
    const instruction = 'Dissolve {{50g}} salt in {{1 liter}} water.';
    const result = scaleInstructionText(instruction, 4, 2);
    
    expect(result).toBe('Dissolve 25 g salt in 1/2 liter water.');
  });

  test('white chocolate mousse - apple juice', () => {
    const instruction = 'Heat {{100ml}} apple juice with the pepper strips.';
    const result = scaleInstructionText(instruction, 4, 2);
    
    expect(result).toBe('Heat 50 ml apple juice with the pepper strips.');
  });

  test('mixed scalable and time', () => {
    const instruction = 'Add {{50ml}} water and simmer for {{10 minutes}} until reduced.';
    const result = scaleInstructionText(instruction, 4, 2);
    
    expect(result).toBe('Add 25 ml water and simmer for 10 minutes until reduced.');
  });

  test('temperature should not scale', () => {
    const instruction = 'Cook sous vide at {{72°C}} for {{12 hours}}.';
    const result = scaleInstructionText(instruction, 4, 2);
    
    expect(result).toBe('Cook sous vide at 72°C for 12 hours.');
  });
});
