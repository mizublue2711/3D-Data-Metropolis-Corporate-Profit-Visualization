import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  FinancialCompanyData,
  sanitizeAndValidateFinancialDataset,
} from '../types';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory cache for the OAuth access token (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Sheets access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Extracts spreadsheetId from either a full Google Sheets URL or a direct ID string.
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export interface SheetMetadataInfo {
  spreadsheetTitle: string;
  sheetNames: string[];
}

/**
 * Fetches spreadsheet metadata first to discover actual tab names (never hardcodes "Sheet1").
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetInput: string,
): Promise<SheetMetadataInfo> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }
  const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
  if (!spreadsheetId) {
    throw new Error('Please enter a valid Google Spreadsheet URL or ID.');
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `Failed to load spreadsheet metadata (HTTP ${res.status})`,
    );
  }

  const data = await res.json();
  const sheetNames: string[] = (data.sheets || [])
    .map((s: { properties?: { title?: string } }) => s.properties?.title)
    .filter(Boolean);

  return {
    spreadsheetTitle: data.properties?.title || 'Financial Report',
    sheetNames: sheetNames.length > 0 ? sheetNames : ['Sheet1'],
  };
}

/**
 * Reads rows from the selected sheet tab and maps them into FinancialCompanyData[].
 */
export async function fetchFinancialDataFromSheet(
  spreadsheetInput: string,
  sheetTabName?: string,
  cellRange = 'A1:Z200',
): Promise<{
  title: string;
  activeTab: string;
  availableTabs: string[];
  records: FinancialCompanyData[];
  warnings: string[];
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
  const metadata = await fetchSpreadsheetMetadata(spreadsheetId);
  const targetTab = sheetTabName || metadata.sheetNames[0];
  const fullRange = `${targetTab}!${cellRange}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(fullRange)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `Failed to fetch range "${fullRange}" (HTTP ${res.status})`,
    );
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length < 2) {
    throw new Error(`No data rows found in sheet "${targetTab}".`);
  }

  // Locate header row (first row that contains ticker/công ty or use row 0)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(' ').toLowerCase();
    if (
      joined.includes('ticker') ||
      joined.includes('mã') ||
      joined.includes('công ty') ||
      joined.includes('ngành')
    ) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = rows[headerRowIdx].map((h) => String(h || '').trim());
  const rawObjects: Record<string, unknown>[] = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Support both header-mapped sheets and positional 9-column Vietnam financial tables:
    // [Ticker, CompanyName, Industry, Q3_2026, Q3_2025, YoY_Q3, 9M_2026, 9M_2025, YoY_9M]
    const obj: Record<string, unknown> = {};
    headers.forEach((h, cIdx) => {
      if (h) obj[h] = row[cIdx];
    });

    if (!obj.ticker && !obj.Ticker && !obj['Mã CK'] && row.length >= 4) {
      obj.ticker = row[0];
      obj.companyName = row[1] || row[0];
      obj.industryLabel = row[2] || 'Other';
      obj.sector = row[2] || 'Other';
      obj.profitQ3_2026 = row[3];
      obj.profitQ3_2025 = row[4];
      obj.growthQ3_YoY = row[5];
      obj.profit9M_2026 = row[6] ?? row[3];
      obj.profit9M_2025 = row[7] ?? row[4];
      obj.growth9M_YoY = row[8] ?? row[5];
    }

    rawObjects.push(obj);
  }

  const { valid, errors } = sanitizeAndValidateFinancialDataset(rawObjects);
  if (valid.length === 0) {
    throw new Error(
      `No valid financial rows parsed. ${errors.slice(0, 3).join('; ')}`,
    );
  }

  return {
    title: metadata.spreadsheetTitle,
    activeTab: targetTab,
    availableTabs: metadata.sheetNames,
    records: valid,
    warnings: errors,
  };
}
