import { sql } from '@/lib/db';
import { ensureClientPackagesSchema } from '@/lib/client-packages';
import { upsertSalonClient } from '@/lib/salon-clients';

export type MembershipImportMode = 'preview' | 'import';
export type MembershipImportField =
  | 'name'
  | 'phone'
  | 'email'
  | 'packageName'
  | 'totalSessions'
  | 'usedSessions'
  | 'remainingSessions'
  | 'price'
  | 'validFrom'
  | 'validTo';
export type MembershipImportColumnMap = Partial<Record<MembershipImportField, number>>;

export type MembershipImportParsedRow = {
  rowNumber: number;
  name: string;
  phone: string | null;
  email: string | null;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  price: number | null;
  validFrom: string | null;
  validTo: string;
  errors: string[];
  warnings: string[];
};

export type MembershipImportResultRow = MembershipImportParsedRow & {
  clientId?: string;
  packageId?: string;
  action?: 'created' | 'updated' | 'skipped';
};

export type MembershipImportResult = {
  ok: boolean;
  headers: string[];
  detectedColumnMap: MembershipImportColumnMap;
  columnMap: MembershipImportColumnMap;
  rows: MembershipImportResultRow[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    createdPackages: number;
    updatedPackages: number;
    skippedPackages: number;
  };
};

type RawParsedCsv = {
  headers: string[];
  rows: string[][];
};

const HEADER_ALIASES: Record<MembershipImportField, string[]> = {
  name: ['name', 'client', 'client name', 'име', 'клиент', 'име на клиент', 'клиент име'],
  phone: ['phone', 'telephone', 'tel', 'mobile', 'телефон', 'тел', 'номер'],
  email: ['email', 'e-mail', 'mail', 'имейл', 'мейл'],
  packageName: ['package', 'membership', 'пакет', 'абонамент', 'карта'],
  totalSessions: ['total credits', 'total sessions', 'sessions', 'credits', 'total', 'кредити', 'общо', 'общ брой', 'тренировки'],
  usedSessions: ['used', 'used credits', 'used sessions', 'използвани', 'ползвани'],
  remainingSessions: ['remaining', 'remaining credits', 'remaining sessions', 'left', 'оставащи', 'остатък'],
  price: ['price', 'amount', 'цена', 'стойност'],
  validFrom: ['valid from', 'from', 'purchased at', 'start', 'валиден от', 'начало'],
  validTo: ['valid to', 'expires', 'expires at', 'expiry', 'valid until', 'to', 'валиден до', 'изтича', 'край'],
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseDelimitedText(text: string): RawParsedCsv {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return { headers: [], rows: [] };

  const lines = normalized.split('\n').filter((line) => line.trim());
  const firstLine = lines[0] ?? '';
  const delimiterCounts = [
    { delimiter: '\t', count: (firstLine.match(/\t/g) ?? []).length },
    { delimiter: ',', count: (firstLine.match(/,/g) ?? []).length },
    { delimiter: ';', count: (firstLine.match(/;/g) ?? []).length },
  ];
  const delimiter = delimiterCounts.sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
  const records = lines.map((line) => splitDelimitedLine(line, delimiter));
  const headers = records[0]?.map((header) => header.trim()) ?? [];
  return { headers, rows: records.slice(1) };
}

function buildHeaderMap(headers: string[]): MembershipImportColumnMap {
  const normalizedHeaders = headers.map(normalizeHeader);
  const map: MembershipImportColumnMap = {};

  (Object.keys(HEADER_ALIASES) as MembershipImportField[]).forEach((key) => {
    const index = normalizedHeaders.findIndex((header) => HEADER_ALIASES[key].includes(header));
    if (index >= 0) map[key] = index;
  });

  return map;
}

function normalizeColumnMap(input: MembershipImportColumnMap | undefined, headerCount: number): MembershipImportColumnMap {
  const out: MembershipImportColumnMap = {};
  if (!input) return out;
  for (const key of Object.keys(HEADER_ALIASES) as MembershipImportField[]) {
    const rawIndex = input[key];
    if (rawIndex == null) continue;
    const index = Math.round(Number(rawIndex));
    if (!Number.isFinite(index) || index < 0 || index >= headerCount) continue;
    out[key] = index;
  }
  return out;
}

function cell(row: string[], index: number | undefined) {
  if (index == null || index < 0) return '';
  return String(row[index] ?? '').trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseInteger(value: string): number | null {
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

function parseMoney(value: string): number | null {
  const cleaned = value.trim().replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
}

function toIsoDate(year: number, month: number, day: number) {
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmy) return toIsoDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;
}

function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function defaultValidTo() {
  return addDaysIso(new Date(), 30);
}

export function parseMembershipCsv(text: string, columnMapInput?: MembershipImportColumnMap): MembershipImportResult {
  const parsed = parseDelimitedText(text);
  const detectedColumnMap = buildHeaderMap(parsed.headers);
  const overrideColumnMap = normalizeColumnMap(columnMapInput, parsed.headers.length);
  const headerMap = { ...detectedColumnMap, ...overrideColumnMap };
  const rows: MembershipImportResultRow[] = [];

  if (parsed.headers.length === 0) {
    return {
      ok: false,
      headers: [],
      detectedColumnMap: {},
      columnMap: {},
      rows: [],
      summary: { totalRows: 0, validRows: 0, errorRows: 1, createdPackages: 0, updatedPackages: 0, skippedPackages: 0 },
    };
  }

  parsed.rows.forEach((rawRow, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const name = cell(rawRow, headerMap.name);
    const phone = cell(rawRow, headerMap.phone) || null;
    const email = normalizeEmail(cell(rawRow, headerMap.email)) || null;
    const explicitPackageName = cell(rawRow, headerMap.packageName);
    const totalRaw = parseInteger(cell(rawRow, headerMap.totalSessions));
    const usedRaw = parseInteger(cell(rawRow, headerMap.usedSessions));
    const remainingRaw = parseInteger(cell(rawRow, headerMap.remainingSessions));
    const price = parseMoney(cell(rawRow, headerMap.price));
    const validFromRaw = cell(rawRow, headerMap.validFrom);
    const validToRaw = cell(rawRow, headerMap.validTo);
    const validFrom = validFromRaw ? parseDate(validFromRaw) : null;
    const validTo = validToRaw ? parseDate(validToRaw) : defaultValidTo();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name) errors.push('Missing client name');
    if (!phone && !email) warnings.push('No phone/email; matching will fall back to name');
    if (email && (!email.includes('@') || email.startsWith('@') || email.endsWith('@'))) {
      errors.push('Invalid email');
    }

    if (validFromRaw && !validFrom) errors.push('Invalid valid from date');
    if (validToRaw && !validTo) errors.push('Invalid valid to/expires date');

    let totalSessions = totalRaw ?? 0;
    let usedSessions = usedRaw ?? 0;
    if (!totalRaw && remainingRaw != null && usedRaw != null) {
      totalSessions = remainingRaw + usedRaw;
    }
    if (!totalSessions && remainingRaw != null) {
      totalSessions = remainingRaw;
    }
    if (!totalSessions) errors.push('Missing total credits/sessions');
    if (!explicitPackageName) warnings.push('No package column; using credits as package name');

    if (remainingRaw != null && usedRaw == null) {
      usedSessions = Math.max(0, totalSessions - remainingRaw);
    }
    if (usedSessions > totalSessions) errors.push('Used sessions exceed total sessions');

    const remainingSessions = Math.max(0, totalSessions - usedSessions);
    const packageName = explicitPackageName || `${totalSessions} тренировки`;

    rows.push({
      rowNumber,
      name,
      phone,
      email,
      packageName,
      totalSessions,
      usedSessions,
      remainingSessions,
      price,
      validFrom,
      validTo: validTo ?? defaultValidTo(),
      errors,
      warnings,
    });
  });

  const errorRows = rows.filter((row) => row.errors.length > 0).length;
  return {
    ok: errorRows === 0,
    headers: parsed.headers,
    detectedColumnMap,
    columnMap: headerMap,
    rows,
    summary: {
      totalRows: rows.length,
      validRows: rows.length - errorRows,
      errorRows,
      createdPackages: 0,
      updatedPackages: 0,
      skippedPackages: 0,
    },
  };
}

export async function importMembershipCsv(input: {
  salonId: string;
  csvText: string;
  columnMap?: MembershipImportColumnMap;
}): Promise<MembershipImportResult> {
  const preview = parseMembershipCsv(input.csvText, input.columnMap);
  if (!preview.ok) return preview;

  await ensureClientPackagesSchema();

  let createdPackages = 0;
  let updatedPackages = 0;
  let skippedPackages = 0;
  const importedRows: MembershipImportResultRow[] = [];

  for (const row of preview.rows) {
    const client = await upsertSalonClient(input.salonId, row.name, {
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
    });

    const existingRows = await sql`
      SELECT id
      FROM client_packages
      WHERE salon_id = ${input.salonId}
        AND client_id = ${client.id}::uuid
        AND lower(trim(package_name)) = lower(trim(${row.packageName}))
        AND total_sessions = ${row.totalSessions}
        AND expires_at = ${row.validTo}::date
      LIMIT 1
    ` as { id: string }[];

    if (existingRows.length > 0) {
      const packageId = String(existingRows[0]!.id);
      await sql`
        UPDATE client_packages
        SET
          client_name = ${row.name},
          client_phone = ${row.phone},
          client_email = ${row.email},
          used_sessions = ${row.usedSessions},
          price = ${row.price},
          purchased_at = COALESCE(${row.validFrom}::timestamptz, purchased_at),
          source = 'csv',
          updated_at = now()
        WHERE id = ${packageId}::uuid
          AND salon_id = ${input.salonId}
      `;
      updatedPackages++;
      importedRows.push({ ...row, clientId: client.id, packageId, action: 'updated' });
      continue;
    }

    const inserted = await sql`
      INSERT INTO client_packages (
        salon_id, client_id, client_name, client_phone, client_email,
        package_name, total_sessions, used_sessions, price, purchased_at, expires_at, source
      )
      VALUES (
        ${input.salonId},
        ${client.id}::uuid,
        ${row.name},
        ${row.phone},
        ${row.email},
        ${row.packageName},
        ${row.totalSessions},
        ${row.usedSessions},
        ${row.price},
        COALESCE(${row.validFrom}::timestamptz, now()),
        ${row.validTo}::date,
        'csv'
      )
      RETURNING id
    ` as { id: string }[];

    if (inserted.length === 0) {
      skippedPackages++;
      importedRows.push({ ...row, clientId: client.id, action: 'skipped' });
    } else {
      createdPackages++;
      importedRows.push({ ...row, clientId: client.id, packageId: String(inserted[0]!.id), action: 'created' });
    }
  }

  return {
    ok: true,
    headers: preview.headers,
    detectedColumnMap: preview.detectedColumnMap,
    columnMap: preview.columnMap,
    rows: importedRows,
    summary: {
      totalRows: importedRows.length,
      validRows: importedRows.length,
      errorRows: 0,
      createdPackages,
      updatedPackages,
      skippedPackages,
    },
  };
}
