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

export const FinancialCompanyDataSchema = z.object({
  id: z.string(),
  ticker: z.string().min(1),
  companyName: z.string(),
  sector: SectorEnum,
  industryLabel: z.string().optional(),
  profitQ3_2026: z.number(),
  profitQ3_2025: z.number().optional(),
  growthQ3_YoY: z.number().nullable(),
  profit9M_2026: z.number(),
  profit9M_2025: z.number().optional(),
  growth9M_YoY: z.number().nullable(),
});

export type FinancialCompanyData = z.infer<typeof FinancialCompanyDataSchema>;

export type MetricMode = 'profitQ3_2026' | 'profit9M_2026' | 'growthYoY';
export type ScaleMode = 'logarithmic' | 'linear';
export type ThemePreset = 'obsidian' | 'titanium' | 'emeraldGold';
export type ColorCodingMode = 'growth' | 'sector' | 'magnitude';
export type ShaderStyleMode = 'monolith' | 'wireframe' | 'glassCore';
export type CameraPresetMode =
  | 'isometric'
  | 'topDown'
  | 'streetDrone'
  | 'duel'
  | 'nightVault';
export type ProfitFilterPreset =
  | 'all'
  | 'over1000'
  | 'over5000'
  | 'hyperGrowth'
  | 'lossOnly';

export type ShellMode = 'title' | 'exploring' | 'reconGame' | 'reconSummary';

export interface MetropolisAppState {
  shellMode: ShellMode;
  activeTab: 'metrics' | 'styling' | 'filtering' | 'camera' | 'telemetry';
  dockCollapsed: boolean;
  showReferenceModal: boolean;
  metricMode: MetricMode;
  scaleMode: ScaleMode;
  themePreset: ThemePreset;
  colorCodingMode: ColorCodingMode;
  shaderStyleMode: ShaderStyleMode;
  cameraPresetMode: CameraPresetMode;
  searchQuery: string;
  selectedSectors: Set<SectorType>;
  profitFilterPreset: ProfitFilterPreset;
  minProfitFilter: number;
  maxProfitFilter: number;
  hoveredCompanyId: string | null;
  lockedCompanyId: string | null;
  duelCompanyA: string;
  duelCompanyB: string;
  soundMuted: boolean;
  // Recon game state
  reconScore: number;
  reconTargetTicker: string | null;
  reconTargetClue: string;
  reconTimeRemaining: number;
  reconScannedCount: number;
  reconStreak: number;
  // Telemetry SLA
  fps: number;
  renderedVoxelCount: number;
}

/**
 * Sanitizes and validates raw imported rows (from JSON, CSV, or Google Sheets)
 * against FinancialCompanyDataSchema with intelligent sector mapping.
 */
export function sanitizeAndValidateFinancialDataset(
  rawItems: unknown[],
): { valid: FinancialCompanyData[]; errors: string[] } {
  const valid: FinancialCompanyData[] = [];
  const errors: string[] = [];

  const mapRawSector = (raw: string): SectorType => {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized.includes('bank') ||
      normalized.includes('ngân hàng') ||
      normalized.includes('bảo hiểm') ||
      normalized.includes('tài chính')
    ) {
      return 'Banking';
    }
    if (
      normalized.includes('real') ||
      normalized.includes('bất động sản') ||
      normalized.includes('hạ tầng') ||
      normalized.includes('kcn')
    ) {
      return 'RealEstate';
    }
    if (
      normalized.includes('energy') ||
      normalized.includes('dầu khí') ||
      normalized.includes('điện') ||
      normalized.includes('xăng dầu')
    ) {
      return 'Energy';
    }
    if (
      normalized.includes('retail') ||
      normalized.includes('bán lẻ') ||
      normalized.includes('f&b') ||
      normalized.includes('nông nghiệp')
    ) {
      return 'Retail';
    }
    if (
      normalized.includes('logistic') ||
      normalized.includes('hàng không') ||
      normalized.includes('vận tải') ||
      normalized.includes('cảng')
    ) {
      return 'Logistics';
    }
    if (
      normalized.includes('manufact') ||
      normalized.includes('thép') ||
      normalized.includes('nhựa') ||
      normalized.includes('vlxd') ||
      normalized.includes('cao su') ||
      normalized.includes('phân bón') ||
      normalized.includes('khoáng sản') ||
      normalized.includes('dệt may')
    ) {
      return 'Manufacturing';
    }
    return 'Other';
  };

  const parseNumber = (val: unknown, fallback = 0): number => {
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === '-' || trimmed === 'N/A') return fallback;
      // Handle accounting negative parentheses e.g. "(328)" or "(1,043)"
      const isParenNeg = trimmed.startsWith('(') && trimmed.endsWith(')');
      const cleaned = trimmed.replace(/[(),%\s]/g, '');
      const parsed = Number(cleaned);
      if (!Number.isNaN(parsed)) {
        return isParenNeg ? -Math.abs(parsed) : parsed;
      }
    }
    return fallback;
  };

  const parseNullableNumber = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return Number.isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === '-' || trimmed === 'N/A') return null;
      const cleaned = trimmed.replace(/[%,\s]/g, '');
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  rawItems.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Row ${idx + 1}: Not an object`);
      return;
    }
    const obj = item as Record<string, unknown>;
    const ticker = String(
      obj.ticker ?? obj.Ticker ?? obj['Mã CK'] ?? obj['Công ty'] ?? '',
    )
      .trim()
      .toUpperCase();
    if (!ticker) {
      errors.push(`Row ${idx + 1}: Missing ticker`);
      return;
    }

    const companyName = String(
      obj.companyName ?? obj.Company ?? obj['Tên công ty'] ?? ticker,
    ).trim();
    const rawSector = String(
      obj.sector ?? obj.Sector ?? obj['Ngành'] ?? 'Other',
    );
    const sector: SectorType = SectorEnum.safeParse(rawSector).success
      ? (rawSector as SectorType)
      : mapRawSector(rawSector);

    const candidate = {
      id: String(obj.id ?? `${ticker.toLowerCase()}-${idx}`),
      ticker,
      companyName,
      sector,
      industryLabel: String(obj.industryLabel ?? obj['Ngành'] ?? sector),
      profitQ3_2026: parseNumber(
        obj.profitQ3_2026 ?? obj['Q3 2026'] ?? obj.q3_2026,
        0,
      ),
      profitQ3_2025: parseNumber(
        obj.profitQ3_2025 ?? obj['Q3 2025'] ?? obj.q3_2025,
        0,
      ),
      growthQ3_YoY: parseNullableNumber(
        obj.growthQ3_YoY ?? obj['Tăng trưởng Q3'] ?? obj.yoy_q3,
      ),
      profit9M_2026: parseNumber(
        obj.profit9M_2026 ?? obj['9T 2026'] ?? obj.m9_2026,
        0,
      ),
      profit9M_2025: parseNumber(
        obj.profit9M_2025 ?? obj['9T 2025'] ?? obj.m9_2025,
        0,
      ),
      growth9M_YoY: parseNullableNumber(
        obj.growth9M_YoY ?? obj['Tăng trưởng 9T'] ?? obj.yoy_9m,
      ),
    };

    const parsed = FinancialCompanyDataSchema.safeParse(candidate);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      errors.push(
        `Row ${idx + 1} (${ticker}): ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      );
    }
  });

  return { valid, errors };
}
