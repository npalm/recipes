/**
 * Unit conversion service for ingredient quantities
 * Follows Single Responsibility Principle - only handles unit conversions
 * Keeps it simple - only metric conversions (ml↔L, g↔kg)
 */

export type ConversionResult = {
  quantity: number;
  unit: string;
  converted: boolean;
};

/**
 * Service for converting between compatible units
 */
export class UnitConverter {
  private readonly volumeConversions: Map<string, number>;
  private readonly weightConversions: Map<string, number>;

  constructor() {
    // Volume conversions to ml (base unit)
    this.volumeConversions = new Map([
      ['ml', 1],
      ['l', 1000],
      ['dl', 100],
      ['cl', 10],
    ]);

    // Weight conversions to g (base unit)
    this.weightConversions = new Map([
      ['g', 1],
      ['kg', 1000],
      ['mg', 0.001],
    ]);
  }

  /**
   * Check if two units are compatible and can be merged
   */
  areUnitsCompatible(unit1?: string, unit2?: string): boolean {
    if (!unit1 || !unit2) return false;
    if (unit1 === unit2) return true;

    const normalized1 = unit1.toLowerCase().trim();
    const normalized2 = unit2.toLowerCase().trim();

    // Check if both are volume units
    if (this.volumeConversions.has(normalized1) && this.volumeConversions.has(normalized2)) {
      return true;
    }

    // Check if both are weight units
    if (this.weightConversions.has(normalized1) && this.weightConversions.has(normalized2)) {
      return true;
    }

    return false;
  }

  /**
   * Convert a quantity to a better display unit
   * e.g., 1500ml → 1.5L, 2000g → 2kg
   */
  convertToBetterUnit(quantity: number, unit?: string): ConversionResult {
    if (!unit) {
      return { quantity, unit: unit || '', converted: false };
    }

    const normalizedUnit = unit.toLowerCase().trim();

    // Volume conversion
    if (this.volumeConversions.has(normalizedUnit)) {
      const baseValue = quantity * (this.volumeConversions.get(normalizedUnit) || 1);

      // Convert to L if >= 1000ml
      if (baseValue >= 1000 && normalizedUnit !== 'l') {
        return {
          quantity: baseValue / 1000,
          unit: 'L',
          converted: true,
        };
      }

      return { quantity, unit, converted: false };
    }

    // Weight conversion
    if (this.weightConversions.has(normalizedUnit)) {
      const baseValue = quantity * (this.weightConversions.get(normalizedUnit) || 1);

      // Convert to kg if >= 1000g
      if (baseValue >= 1000 && normalizedUnit !== 'kg') {
        return {
          quantity: baseValue / 1000,
          unit: 'kg',
          converted: true,
        };
      }

      return { quantity, unit, converted: false };
    }

    return { quantity, unit, converted: false };
  }

  /**
   * Add two quantities with compatible units
   * Returns the sum in the most appropriate unit
   */
  addQuantities(
    qty1: number,
    unit1: string | undefined,
    qty2: number,
    unit2: string | undefined
  ): ConversionResult {
    // If no units, just add quantities
    if (!unit1 && !unit2) {
      return { quantity: qty1 + qty2, unit: '', converted: false };
    }

    // If units are the same, simple addition
    if (unit1 === unit2) {
      return this.convertToBetterUnit(qty1 + qty2, unit1);
    }

    // If units are incompatible, cannot add
    if (!this.areUnitsCompatible(unit1, unit2)) {
      throw new Error(`Cannot add incompatible units: ${unit1} and ${unit2}`);
    }

    const normalized1 = unit1?.toLowerCase().trim() || '';
    const normalized2 = unit2?.toLowerCase().trim() || '';

    // Convert both to base unit and add
    let baseValue = 0;
    let targetUnit = '';

    if (this.volumeConversions.has(normalized1) && this.volumeConversions.has(normalized2)) {
      const base1 = qty1 * (this.volumeConversions.get(normalized1) || 1);
      const base2 = qty2 * (this.volumeConversions.get(normalized2) || 1);
      baseValue = base1 + base2;

      // Use 'ml' as base, then convert to better unit
      return this.convertToBetterUnit(baseValue, 'ml');
    }

    if (this.weightConversions.has(normalized1) && this.weightConversions.has(normalized2)) {
      const base1 = qty1 * (this.weightConversions.get(normalized1) || 1);
      const base2 = qty2 * (this.weightConversions.get(normalized2) || 1);
      baseValue = base1 + base2;

      // Use 'g' as base, then convert to better unit
      return this.convertToBetterUnit(baseValue, 'g');
    }

    return { quantity: qty1 + qty2, unit: unit1 || unit2 || '', converted: false };
  }
}
