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
  ticker: z.string().default('UNKNOWN'),
  identifier: z.string().optional(),
  companyName: z.string().default(''),
  sector: SectorEnum.default('Other'),
  industryLabel: z.string().optional(),
  profitQ3_2026: z.number().default(0),
  profitQ3_2025: z.number().optional().default(0),
  growthQ3_YoY: z.number().nullable().default(null),
  profit9M_2026: z.number().default(0),
  profit9M_2025: z.number().optional().default(0),
  growth9M_YoY: z.number().nullable().default(null),
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

  const cleanAndParseFloat = (val: unknown, fallback = 0): number => {
    if (typeof val === 'number') return Number.isNaN(val) ? fallback : val;
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
      // Handle accounting parentheses negative e.g. "(1,000)" or "(45.6)"
      const isParenNeg = trimmed.startsWith('(') && trimmed.endsWith(')');
      // Remove commas, currency symbols, %, and whitespace
      const cleaned = trimmed.replace(/[(),$%₫\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!Number.isNaN(parsed)) {
        return isParenNeg ? -Math.abs(parsed) : parsed;
      }
    }
    return fallback;
  };

  const cleanAndParseNullableFloat = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return Number.isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === '-' || trimmed === 'N/A') return null;
      const isParenNeg = trimmed.startsWith('(') && trimmed.endsWith(')');
      const cleaned = trimmed.replace(/[(),$%₫\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!Number.isNaN(parsed)) {
        return isParenNeg ? -Math.abs(parsed) : parsed;
      }
    }
    return null;
  };

  rawItems.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Row ${idx + 1}: Not an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const keys = Object.keys(row);
    if (keys.length === 0) {
      errors.push(`Row ${idx + 1}: Empty row`);
      return;
    }

    // YÊU CẦU 1: Linh hoạt cột định danh đầu tiên (Bỏ ràng buộc cứng 'ticker')
    const firstKey = keys[0];
    const identifier = String(
      (firstKey !== undefined ? row[firstKey] : '') || '',
    ).trim();
    const finalIdentifier =
      identifier ||
      String(
        row.ticker ??
        row.Ticker ??
        row['Mã CK'] ??
        row['Công ty'] ??
        `ROW_${idx + 1}`,
      ).trim();

    // YÊU CẦU 2: Tự động phát hiện và Map cột số nếu header khác mặc định
    const numericKeys = keys.filter((k) => {
      if (k === firstKey) return false;
      const raw = row[k];
      if (raw === null || raw === undefined || raw === '') return false;
      if (typeof raw === 'number' && !Number.isNaN(raw)) return true;
      if (typeof raw === 'string') {
        const cleaned = raw.trim().replace(/[(),$%₫\s]/g, '');
        return cleaned !== '' && !Number.isNaN(parseFloat(cleaned));
      }
      return false;
    });

    const explicitQ3 =
      row.profitQ3_2026 ??
      row['Q3 2026'] ??
      row.q3_2026 ??
      row['LNTT Q3'] ??
      row['Lợi nhuận Q3'] ??
      row['Lợi nhuận'] ??
      row['Profit'] ??
      row['Value'] ??
      row['Doanh thu'] ??
      row['Revenue'];

    const explicit9M =
      row.profit9M_2026 ??
      row['9T 2026'] ??
      row.m9_2026 ??
      row['LNTT 9T'] ??
      row['9M'];

    const explicitGrowthQ3 =
      row.growthQ3_YoY ??
      row['Tăng trưởng Q3'] ??
      row.yoy_q3 ??
      row['Tăng trưởng'] ??
      row['Growth'];

    // Map to primary 3D height variable (profitQ3_2026) for logarithm scaling:
    const primaryNumVal =
      explicitQ3 !== undefined
        ? cleanAndParseFloat(explicitQ3, 0)
        : numericKeys.length > 0
          ? cleanAndParseFloat(row[numericKeys[0]], 0)
          : 0;

    const secondaryNumVal =
      explicit9M !== undefined
        ? cleanAndParseFloat(explicit9M, primaryNumVal)
        : numericKeys.length > 1
          ? cleanAndParseFloat(row[numericKeys[1]], primaryNumVal)
          : primaryNumVal;

    const growthVal =
      explicitGrowthQ3 !== undefined
        ? cleanAndParseNullableFloat(explicitGrowthQ3)
        : numericKeys.length > 2
          ? cleanAndParseNullableFloat(row[numericKeys[2]])
          : null;

    const nonNumericKeys = keys.filter(
      (k) => k !== firstKey && !numericKeys.includes(k),
    );

    const companyName = String(
      row.companyName ??
      row.Company ??
      row['Tên công ty'] ??
      row['Name'] ??
      (nonNumericKeys.length > 0 ? row[nonNumericKeys[0]] : finalIdentifier),
    ).trim() || finalIdentifier;

    const rawSector = String(
      row.sector ??
      row.Sector ??
      row['Ngành'] ??
      (nonNumericKeys.length > 1 ? row[nonNumericKeys[1]] : 'Other'),
    );
    const sector: SectorType = SectorEnum.safeParse(rawSector).success
      ? (rawSector as SectorType)
      : mapRawSector(rawSector);

    const candidate = {
      id: String(
        row.id ??
        `${finalIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${idx}`,
      ),
      ticker: finalIdentifier,
      identifier: finalIdentifier,
      companyName,
      sector,
      industryLabel: String(
        row.industryLabel ?? row['Ngành'] ?? sector,
      ),
      profitQ3_2026: primaryNumVal,
      profitQ3_2025: cleanAndParseFloat(
        row.profitQ3_2025 ?? row['Q3 2025'] ?? row.q3_2025,
        0,
      ),
      growthQ3_YoY: growthVal,
      profit9M_2026: secondaryNumVal,
      profit9M_2025: cleanAndParseFloat(
        row.profit9M_2025 ?? row['9T 2025'] ?? row.m9_2025,
        0,
      ),
      growth9M_YoY: cleanAndParseNullableFloat(
        row.growth9M_YoY ?? row['Tăng trưởng 9T'] ?? row.yoy_9m ?? growthVal,
      ),
    };

    try {
      const parsed = FinancialCompanyDataSchema.safeParse(candidate);
      if (parsed.success) {
        valid.push(parsed.data);
      } else {
        // Fallback compensation to prevent app crash and preserve row
        valid.push({
          id: candidate.id,
          ticker: candidate.ticker,
          identifier: candidate.identifier,
          companyName: candidate.companyName,
          sector: candidate.sector,
          industryLabel: candidate.industryLabel,
          profitQ3_2026: candidate.profitQ3_2026,
          profitQ3_2025: candidate.profitQ3_2025,
          growthQ3_YoY: candidate.growthQ3_YoY,
          profit9M_2026: candidate.profit9M_2026,
          profit9M_2025: candidate.profit9M_2025,
          growth9M_YoY: candidate.growth9M_YoY,
        });
      }
    } catch (err) {
      errors.push(
        `Row ${idx + 1} (${finalIdentifier}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  return { valid, errors };
}
