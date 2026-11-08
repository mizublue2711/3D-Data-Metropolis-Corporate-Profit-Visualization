import { z } from 'zod';

export const SectorEnum = z.enum([
  'Banking',
  'RealEstate',
  'Energy',
  'Retail',
  'Logistics',
  'Manufacturing',
  'Other',
]);

export type SectorType = z.infer<typeof SectorEnum>;

/**
 * Preprocesses unknown values (strings, numbers, currencies, accounting parentheses) into standard floats.
 */
export function preprocessNumeric(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number') {
    return Number.isNaN(val) ? fallback : val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === '-' ||
      trimmed === 'N/A' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return fallback;
    }
    const isParenNeg = trimmed.startsWith('(') && trimmed.endsWith(')');
    const cleaned = trimmed.replace(/[(),$%₫\s]/g, '');
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed)) {
      return isParenNeg ? -Math.abs(parsed) : parsed;
    }
  }
  return fallback;
}

/**
 * Preprocesses nullable numbers (such as growth YoY where turnaround/null is meaningful).
 */
export function preprocessNullableNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === '-' ||
      trimmed === 'N/A' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return null;
    }
    const isParenNeg = trimmed.startsWith('(') && trimmed.endsWith(')');
    const cleaned = trimmed.replace(/[(),$%₫\s]/g, '');
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed)) {
      return isParenNeg ? -Math.abs(parsed) : parsed;
    }
  }
  return null;
}

/**
 * Upgraded FinancialCompanyDataSchema for AST v2 flexibility:
 * - Uses .passthrough() to preserve AST v2 geometry, position, colorHex, layer, path metadata.
 * - Uses z.preprocess with z.coerce.number() to safely coerce numeric strings ("269", "-50%", etc.).
 */
export const FinancialCompanyDataSchema = z
  .object({
    id: z.string().default(() => `comp_${Math.random().toString(36).substring(2, 9)}`),
    ticker: z.string().default('UNKNOWN'),
    identifier: z.string().optional(),
    companyName: z.string().default(''),
    sector: SectorEnum.default('Other'),
    industryLabel: z.string().optional(),
    profitQ3_2026: z.preprocess(
      (val) => preprocessNumeric(val, 0),
      z.coerce.number().default(0),
    ),
    profitQ3_2025: z.preprocess(
      (val) => preprocessNumeric(val, 0),
      z.coerce.number().optional().default(0),
    ),
    growthQ3_YoY: z.preprocess(
      (val) => preprocessNullableNumeric(val),
      z.coerce.number().nullable().default(null),
    ),
    profit9M_2026: z.preprocess(
      (val) => preprocessNumeric(val, 0),
      z.coerce.number().default(0),
    ),
    profit9M_2025: z.preprocess(
      (val) => preprocessNumeric(val, 0),
      z.coerce.number().optional().default(0),
    ),
    growth9M_YoY: z.preprocess(
      (val) => preprocessNullableNumeric(val),
      z.coerce.number().nullable().default(null),
    ),
  })
  .passthrough();

export type FinancialCompanyData = z.infer<typeof FinancialCompanyDataSchema>;

/**
 * Schema supporting both flat arrays and AST v2 / wrapper root objects.
 */
export const FinancialDatasetWrapperSchema = z.union([
  z.array(FinancialCompanyDataSchema),
  z
    .object({
      version: z.string().optional(),
      systemIdentity: z.string().optional(),
      data: z.array(FinancialCompanyDataSchema),
    })
    .passthrough(),
  z
    .object({
      version: z.string().optional(),
      systemIdentity: z.string().optional(),
      companies: z.array(FinancialCompanyDataSchema),
    })
    .passthrough(),
  z
    .object({
      version: z.string().optional(),
      systemIdentity: z.string().optional(),
      items: z.array(FinancialCompanyDataSchema),
    })
    .passthrough(),
  z
    .object({
      version: z.string().optional(),
      systemIdentity: z.string().optional(),
      tree: z
        .object({
          children: z.array(z.record(z.string(), z.unknown())),
        })
        .passthrough(),
    })
    .passthrough(),
]);

/**
 * Extracts raw company records from flat arrays, object wrappers, or AST v2 tree structures.
 */
export function extractRawRowsFromJson(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data;
    }
    if (Array.isArray(obj.companies)) {
      return obj.companies;
    }
    if (Array.isArray(obj.items)) {
      return obj.items;
    }
    if (obj.tree && typeof obj.tree === 'object') {
      const tree = obj.tree as Record<string, unknown>;
      if (Array.isArray(tree.children)) {
        return tree.children;
      }
    }
    if (Array.isArray(obj.children)) {
      return obj.children;
    }
  }
  return [];
}
