import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { adminAccount } from './admin-account';
import { findClient } from './clients';
import { hashPassword, randomSalt } from './password';
import { defaultRegistry, hydrateRegistry } from './registry';
import { sampleBawasluReport } from './seed';
import type { Account, Contract, Customer, Personnel, Registry, Report, SessionUser, UserRole } from './types';

const WEB_KEY = 'eos.store.v1';

type WebStore = {
  reports: Report[];
  settings: Record<string, string>;
  users: Account[];
  customers: Customer[];
  personnel: Personnel[];
  contracts: Contract[];
};

function emptyStore(): WebStore {
  return { reports: [], settings: {}, users: [], customers: [], personnel: [], contracts: [] };
}

function toSession(account: Account): SessionUser {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
  };
}

function readWeb(): WebStore {
  const raw = globalThis.localStorage?.getItem(WEB_KEY);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<WebStore>;
    return {
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      settings: parsed.settings ?? {},
      users: Array.isArray(parsed.users) ? parsed.users : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      personnel: Array.isArray(parsed.personnel) ? parsed.personnel : [],
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeWeb(store: WebStore): void {
  globalThis.localStorage.setItem(WEB_KEY, JSON.stringify(store));
}

function withAccounts(store: WebStore): WebStore {
  const seeded = store.settings.seeded === '1';
  const next: WebStore = {
    ...store,
    reports: !seeded && store.reports.length === 0 ? [sampleBawasluReport()] : store.reports,
    users: store.users.length > 0 ? store.users : [{ ...adminAccount }],
    settings: seeded ? store.settings : { ...store.settings, seeded: '1' },
  };
  if (JSON.stringify(next) !== JSON.stringify(store)) writeWeb(next);
  return next;
}

function ensureWeb(): WebStore {
  const withUsers = withAccounts(readWeb());
  if (withUsers.settings.registry === '1') return withUsers;
  const seeded = defaultRegistry();
  const next: WebStore = {
    ...withUsers,
    reports: withUsers.reports.map((report) =>
      report.clientId === 'bawaslu' && !report.contractId
        ? { ...report, contractId: 'contract-bawaslu-2026', contractCode: 'EOS-BW-2026', personnelId: 'personnel-rakan' }
        : report,
    ),
    customers: withUsers.customers.length > 0 ? withUsers.customers : seeded.customers,
    personnel: withUsers.personnel.length > 0 ? withUsers.personnel : seeded.personnel,
    contracts: withUsers.contracts.length > 0 ? withUsers.contracts : seeded.contracts,
    settings: { ...withUsers.settings, registry: '1' },
  };
  writeWeb(next);
  return next;
}

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLiteDatabase> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync('eos.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY NOT NULL,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL
    );
  `);
  const userCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM users');
  if (!userCount || userCount.count === 0) {
    await writeSqliteUser(db, { ...adminAccount });
  }
  const seeded = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['seeded']);
  if (!seeded) {
    const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM reports');
    if (!existing || existing.count === 0) {
      await writeSqliteReport(db, sampleBawasluReport());
    }
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['seeded', '1']);
  }
  const registry = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['registry']);
  if (!registry) {
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['ops.registry', JSON.stringify(defaultRegistry())]);
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['registry', '1']);
  }
  return db;
}

function database(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function initDb(): Promise<void> {
  if (Platform.OS === 'web') {
    ensureWeb();
    return;
  }
  await database();
}

async function writeSqliteUser(db: SQLiteDatabase, account: Account): Promise<void> {
  await db.runAsync(
    `INSERT INTO users (id, username, payload) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET username = excluded.username, payload = excluded.payload`,
    [account.id, account.username, JSON.stringify(account)],
  );
}

async function writeSqliteReport(db: SQLiteDatabase, report: Report): Promise<void> {
  await db.runAsync(
    `INSERT INTO reports (id, client_id, date, status, updated_at, payload)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       client_id = excluded.client_id,
       date = excluded.date,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
    [report.id, report.clientId, report.date, report.status, report.updatedAt, JSON.stringify(report)],
  );
}

function sortReports(reports: Report[]): Report[] {
  return [...reports].sort((left, right) => {
    const byDate = right.date.localeCompare(left.date);
    if (byDate !== 0) return byDate;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function listReports(): Promise<Report[]> {
  if (Platform.OS === 'web') return sortReports(ensureWeb().reports);
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM reports ORDER BY date DESC, updated_at DESC',
  );
  return rows.map((row) => JSON.parse(row.payload) as Report);
}

export async function getReport(id: string): Promise<Report | null> {
  if (Platform.OS === 'web') return ensureWeb().reports.find((report) => report.id === id) ?? null;
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM reports WHERE id = ?', [id]);
  return row ? (JSON.parse(row.payload) as Report) : null;
}

export async function saveReport(report: Report): Promise<void> {
  const next = { ...report, updatedAt: new Date().toISOString() };
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    const reports = store.reports.filter((item) => item.id !== next.id);
    reports.push(next);
    writeWeb({ ...store, reports });
    return;
  }
  const db = await database();
  await writeSqliteReport(db, next);
}

export async function deleteReport(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    writeWeb({ ...store, reports: store.reports.filter((report) => report.id !== id) });
    return;
  }
  const db = await database();
  await db.runAsync('DELETE FROM reports WHERE id = ?', [id]);
}

export async function uniqueCode(base: string, selfId: string): Promise<string> {
  const reports = await listReports();
  const used = new Set(reports.filter((report) => report.id !== selfId).map((report) => report.code));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function codeFor(clientId: string, date: string): string {
  const client = findClient(clientId);
  const compact = date.replaceAll('-', '').slice(2);
  return `${client.codePrefix}-${compact}`;
}

export async function getEngineerName(): Promise<string> {
  if (Platform.OS === 'web') return ensureWeb().settings.engineerName ?? '';
  const db = await database();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
    'engineerName',
  ]);
  return row?.value ?? '';
}

async function readUsers(): Promise<Account[]> {
  if (Platform.OS === 'web') return ensureWeb().users;
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM users ORDER BY username');
  return rows.map((row) => JSON.parse(row.payload) as Account);
}

async function readSetting(key: string): Promise<string> {
  if (Platform.OS === 'web') return ensureWeb().settings[key] ?? '';
  const db = await database();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? '';
}

async function writeSetting(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    writeWeb({ ...store, settings: { ...store.settings, [key]: value } });
    return;
  }
  const db = await database();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function listUsers(): Promise<SessionUser[]> {
  const users = await readUsers();
  return users.map(toSession).sort((left, right) => left.username.localeCompare(right.username));
}

export async function login(username: string, password: string): Promise<SessionUser | null> {
  const name = username.trim().toLowerCase();
  const account = (await readUsers()).find((user) => user.username === name);
  if (!account || hashPassword(account.salt, password) !== account.passwordHash) return null;
  await writeSetting('sessionUserId', account.id);
  return toSession(account);
}

export async function currentSession(): Promise<SessionUser | null> {
  const id = await readSetting('sessionUserId');
  if (!id) return null;
  const account = (await readUsers()).find((user) => user.id === id);
  return account ? toSession(account) : null;
}

export async function logout(): Promise<void> {
  await writeSetting('sessionUserId', '');
}

export async function createUser(input: {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
}): Promise<SessionUser> {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('Nama pengguna 3–32 karakter: huruf, angka, titik, atau garis.');
  }
  if (input.password.length < 8) throw new Error('Kata sandi minimal 8 karakter.');
  if (!displayName) throw new Error('Isi nama tampilan.');
  const users = await readUsers();
  if (users.some((user) => user.username === username)) throw new Error('Nama pengguna sudah dipakai.');
  const salt = randomSalt();
  const account: Account = {
    id: `user-${Date.now().toString(36)}`,
    username,
    displayName,
    role: input.role,
    salt,
    passwordHash: hashPassword(salt, input.password),
  };
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    writeWeb({ ...store, users: [...store.users, account] });
  } else {
    const db = await database();
    await writeSqliteUser(db, account);
  }
  return toSession(account);
}

export async function loadRegistry(): Promise<Registry> {
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    return hydrateRegistry(store);
  }
  const raw = await readSetting('ops.registry');
  if (!raw) return defaultRegistry();
  try {
    return hydrateRegistry(JSON.parse(raw) as Partial<Registry>);
  } catch {
    return defaultRegistry();
  }
}

async function storeRegistry(registry: Registry): Promise<void> {
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    writeWeb({ ...store, ...registry, settings: { ...store.settings, registry: '1' } });
    return;
  }
  await writeSetting('ops.registry', JSON.stringify(registry));
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const registry = await loadRegistry();
  const customers = registry.customers.filter((item) => item.id !== customer.id);
  customers.push(customer);
  await storeRegistry(hydrateRegistry({ ...registry, customers }));
}

export async function deleteCustomer(id: string): Promise<void> {
  const registry = await loadRegistry();
  if (registry.personnel.some((person) => person.customerId === id)) {
    throw new Error('assigned');
  }
  await storeRegistry(hydrateRegistry({
    ...registry,
    customers: registry.customers.filter((item) => item.id !== id),
  }));
}

export async function savePersonnel(person: Personnel): Promise<void> {
  const registry = await loadRegistry();
  const personnel = registry.personnel.filter((item) => item.id !== person.id);
  personnel.push(person);
  await storeRegistry(hydrateRegistry({ ...registry, personnel }));
}

export async function deletePersonnel(id: string): Promise<void> {
  const registry = await loadRegistry();
  await storeRegistry(hydrateRegistry({
    ...registry,
    personnel: registry.personnel.filter((item) => item.id !== id),
  }));
}

export async function saveContract(contract: Contract): Promise<void> {
  const registry = await loadRegistry();
  const contracts = registry.contracts.filter((item) => item.id !== contract.id);
  contracts.push(contract);
  await storeRegistry({ ...registry, contracts });
}

export async function deleteContract(id: string): Promise<void> {
  const registry = await loadRegistry();
  await storeRegistry({ ...registry, contracts: registry.contracts.filter((item) => item.id !== id) });
}

export async function setEngineerName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (Platform.OS === 'web') {
    const store = ensureWeb();
    writeWeb({ ...store, settings: { ...store.settings, engineerName: trimmed } });
    return;
  }
  const db = await database();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ['engineerName', trimmed],
  );
}
