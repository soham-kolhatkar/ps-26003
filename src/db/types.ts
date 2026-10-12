/**
 * Minimal database surface used by every repo.
 * `expo-sqlite`'s SQLiteDatabase satisfies it on device; tests use a
 * node:sqlite adapter (see __tests__/nodeDb.ts), so all SQL is exercised in CI.
 */
export type SqlValue = string | number | null;
export type SqlParams = SqlValue[];

export type RunResult = { changes: number; lastInsertRowId: number };

export interface DbClient {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParams): Promise<RunResult>;
  getAllAsync<T>(source: string, params: SqlParams): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
