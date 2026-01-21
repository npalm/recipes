/**
 * Unit Converter Service Tests
 * Tests unit conversion logic following existing test patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnitConverter } from '@/modules/shopping/services/unitConverter';

describe('UnitConverter', () => {
  let converter: UnitConverter;

  beforeEach(() => {
    converter = new UnitConverter();
  });

  describe('areUnitsCompatible', () => {
    it('returns true for same units', () => {
      expect(converter.areUnitsCompatible('ml', 'ml')).toBe(true);
      expect(converter.areUnitsCompatible('g', 'g')).toBe(true);
    });

    it('returns true for compatible volume units', () => {
      expect(converter.areUnitsCompatible('ml', 'l')).toBe(true);
      expect(converter.areUnitsCompatible('l', 'ml')).toBe(true);
      expect(converter.areUnitsCompatible('cl', 'dl')).toBe(true);
    });

    it('returns true for compatible weight units', () => {
      expect(converter.areUnitsCompatible('g', 'kg')).toBe(true);
      expect(converter.areUnitsCompatible('kg', 'g')).toBe(true);
      expect(converter.areUnitsCompatible('mg', 'g')).toBe(true);
    });

    it('returns false for incompatible units', () => {
      expect(converter.areUnitsCompatible('ml', 'g')).toBe(false);
      expect(converter.areUnitsCompatible('kg', 'l')).toBe(false);
      expect(converter.areUnitsCompatible('cup', 'tbsp')).toBe(false);
    });

    it('returns false when one or both units are undefined', () => {
      expect(converter.areUnitsCompatible(undefined, 'ml')).toBe(false);
      expect(converter.areUnitsCompatible('ml', undefined)).toBe(false);
      expect(converter.areUnitsCompatible(undefined, undefined)).toBe(false);
    });

    it('handles case-insensitive comparison', () => {
      expect(converter.areUnitsCompatible('ML', 'ml')).toBe(true);
      expect(converter.areUnitsCompatible('L', 'ml')).toBe(true);
      expect(converter.areUnitsCompatible('G', 'KG')).toBe(true);
    });
  });

  describe('convertToBetterUnit', () => {
    it('converts ml to L when >= 1000ml', () => {
      const result = converter.convertToBetterUnit(1000, 'ml');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('L');
      expect(result.converted).toBe(true);
    });

    it('converts ml to L for values > 1000ml', () => {
      const result = converter.convertToBetterUnit(1500, 'ml');
      expect(result.quantity).toBe(1.5);
      expect(result.unit).toBe('L');
      expect(result.converted).toBe(true);
    });

    it('keeps ml when < 1000ml', () => {
      const result = converter.convertToBetterUnit(500, 'ml');
      expect(result.quantity).toBe(500);
      expect(result.unit).toBe('ml');
      expect(result.converted).toBe(false);
    });

    it('converts g to kg when >= 1000g', () => {
      const result = converter.convertToBetterUnit(2000, 'g');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('kg');
      expect(result.converted).toBe(true);
    });

    it('keeps g when < 1000g', () => {
      const result = converter.convertToBetterUnit(750, 'g');
      expect(result.quantity).toBe(750);
      expect(result.unit).toBe('g');
      expect(result.converted).toBe(false);
    });

    it('does not convert already L or kg units', () => {
      const result1 = converter.convertToBetterUnit(2, 'L');
      expect(result1.quantity).toBe(2);
      expect(result1.unit).toBe('L');
      expect(result1.converted).toBe(false);

      const result2 = converter.convertToBetterUnit(3, 'kg');
      expect(result2.quantity).toBe(3);
      expect(result2.unit).toBe('kg');
      expect(result2.converted).toBe(false);
    });

    it('handles undefined unit', () => {
      const result = converter.convertToBetterUnit(100, undefined);
      expect(result.quantity).toBe(100);
      expect(result.unit).toBe('');
      expect(result.converted).toBe(false);
    });

    it('handles unknown units by returning as-is', () => {
      const result = converter.convertToBetterUnit(5, 'cups');
      expect(result.quantity).toBe(5);
      expect(result.unit).toBe('cups');
      expect(result.converted).toBe(false);
    });
  });

  describe('addQuantities', () => {
    it('adds quantities with same unit', () => {
      const result = converter.addQuantities(100, 'ml', 200, 'ml');
      expect(result.quantity).toBe(300);
      expect(result.unit).toBe('ml');
    });

    it('adds and converts ml to L when total >= 1000', () => {
      const result = converter.addQuantities(600, 'ml', 500, 'ml');
      expect(result.quantity).toBe(1.1);
      expect(result.unit).toBe('L');
      expect(result.converted).toBe(true);
    });

    it('adds quantities with compatible units (ml + L)', () => {
      const result = converter.addQuantities(500, 'ml', 1, 'L');
      expect(result.quantity).toBe(1.5);
      expect(result.unit).toBe('L');
      expect(result.converted).toBe(true);
    });

    it('adds quantities with compatible units (g + kg)', () => {
      const result = converter.addQuantities(250, 'g', 1, 'kg');
      expect(result.quantity).toBe(1.25);
      expect(result.unit).toBe('kg');
      expect(result.converted).toBe(true);
    });

    it('throws error for incompatible units', () => {
      expect(() => {
        converter.addQuantities(100, 'ml', 100, 'g');
      }).toThrow('Cannot add incompatible units');
    });

    it('adds quantities when both have no unit', () => {
      const result = converter.addQuantities(2, undefined, 3, undefined);
      expect(result.quantity).toBe(5);
      expect(result.unit).toBe('');
    });

    it('handles case-insensitive units', () => {
      const result = converter.addQuantities(500, 'ML', 1, 'L');
      expect(result.quantity).toBe(1.5);
      expect(result.unit).toBe('L');
    });

    it('converts dl + ml correctly', () => {
      const result = converter.addQuantities(2, 'dl', 500, 'ml');
      expect(result.quantity).toBe(700);
      expect(result.unit).toBe('ml');
    });
  });
});
