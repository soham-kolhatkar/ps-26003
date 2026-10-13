import type { AlertKind, AlertSeverity, DetectedAlert } from '@/engine/trends';

import { newId } from '../ids';
import type { DbClient } from '../types';

export type AlertRow = {
  id: string;
  patient_id: string;
  alert_key: string;
  kind: AlertKind;
  game_id: string | null;
  severity: AlertSeverity;
  detail: string;
  first_seen_at: number;
  updated_at: number;
  seen_at: number | null;
  resolved_at: number | null;
};

export type StoredAlert = {
  id: string;
  patientId: string;
  key: string;
  kind: AlertKind;
  gameId: string | null;
  severity: AlertSeverity;
  /** The numbers behind the alert (shape depends on `kind`, see engine/trends). */
  detail: Record<string, number | string>;
  firstSeenAt: number;
  updatedAt: number;
  seenAt: number | null;
  resolvedAt: number | null;
};

function toAlert(r: AlertRow): StoredAlert {
  return {
    id: r.id,
    patientId: r.patient_id,
    key: r.alert_key,
    kind: r.kind,
    gameId: r.game_id,
    severity: r.severity,
    detail: JSON.parse(r.detail),
    firstSeenAt: r.first_seen_at,
    updatedAt: r.updated_at,
    seenAt: r.seen_at,
    resolvedAt: r.resolved_at,
  };
}

const RANK: Record<AlertSeverity, number> = { info: 0, warning: 1, serious: 2 };

/**
 * Makes the stored open alerts match what the engine detects now:
 * new → inserted (unseen); still there → numbers updated (and marked unseen
 * again if it got more serious); gone → resolved.
 * Not wrapped in withTransactionAsync: expo-sqlite transactions are not
 * exclusive, so concurrent queries could interleave. Callers serialise
 * instead (services/alerts), and the insert ignores a duplicate open key.
 */
export async function syncAlerts(
  db: DbClient,
  patientId: string,
  detected: readonly DetectedAlert[],
  now = Date.now(),
): Promise<void> {
  const open = await db.getAllAsync<AlertRow>('SELECT * FROM alert WHERE patient_id = ? AND resolved_at IS NULL', [
    patientId,
  ]);
  const byKey = new Map(open.map((r) => [r.alert_key, r]));
  {
    for (const d of detected) {
      const existing = byKey.get(d.key);
      const detail = JSON.stringify(d.detail);
      const gameId = d.kind === 'game_decline' ? d.detail.gameId : null;
      if (!existing) {
        await db.runAsync(
          `INSERT OR IGNORE INTO alert (id, patient_id, alert_key, kind, game_id, severity, detail, first_seen_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId(), patientId, d.key, d.kind, gameId, d.severity, detail, now, now],
        );
        continue;
      }
      byKey.delete(d.key);
      if (existing.severity === d.severity && existing.detail === detail) continue;
      const worse = RANK[d.severity] > RANK[existing.severity];
      await db.runAsync(
        `UPDATE alert SET severity = ?, detail = ?, updated_at = ?, seen_at = CASE WHEN ? THEN NULL ELSE seen_at END
         WHERE id = ?`,
        [d.severity, detail, now, worse ? 1 : 0, existing.id],
      );
    }
    for (const gone of byKey.values()) {
      await db.runAsync('UPDATE alert SET resolved_at = ?, updated_at = ? WHERE id = ?', [now, now, gone.id]);
    }
  }
}

/** Open alerts (most serious first), plus alerts resolved since `resolvedSince` if given. */
export async function listAlerts(
  db: DbClient,
  patientId: string,
  opts: { resolvedSince?: number } = {},
): Promise<StoredAlert[]> {
  const rows = await db.getAllAsync<AlertRow>(
    `SELECT * FROM alert WHERE patient_id = ? AND (resolved_at IS NULL OR resolved_at >= ?)
     ORDER BY resolved_at IS NOT NULL, CASE severity WHEN 'serious' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       first_seen_at DESC`,
    [patientId, opts.resolvedSince ?? Number.MAX_SAFE_INTEGER],
  );
  return rows.map(toAlert);
}

export async function markAlertsSeen(db: DbClient, patientId: string, now = Date.now()): Promise<void> {
  await db.runAsync('UPDATE alert SET seen_at = ? WHERE patient_id = ? AND resolved_at IS NULL AND seen_at IS NULL', [
    now,
    patientId,
  ]);
}

export type AlertCounts = { open: number; unseen: number; serious: number };

export async function alertCounts(db: DbClient, patientId: string): Promise<AlertCounts> {
  const row = await db.getFirstAsync<AlertCounts>(
    `SELECT COUNT(*) AS open,
       COALESCE(SUM(seen_at IS NULL), 0) AS unseen,
       COALESCE(SUM(severity = 'serious'), 0) AS serious
     FROM alert WHERE patient_id = ? AND resolved_at IS NULL`,
    [patientId],
  );
  return row ?? { open: 0, unseen: 0, serious: 0 };
}
