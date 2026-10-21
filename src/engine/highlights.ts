/**
 * The "summary" sentences at the top of the family's Progress screen (D55): what
 * matters this period, in plain words, before any number or chart. Pure: the screen
 * turns each line into text (`progress.hl.<key>`) and a status shape.
 */
export type HighlightStatus = 'urgent' | 'soon' | 'well' | 'info';

export type Highlight = { status: HighlightStatus; key: string; params?: Record<string, string | number> };

export type HighlightAlert =
  | { kind: 'game_decline'; serious: boolean; gameId: string }
  | { kind: 'adherence_low'; serious: boolean; ratePct: number }
  | { kind: 'inactive'; serious: boolean; days: number };

export type HighlightInput = {
  /** Open trend alerts, most serious first. */
  alerts: readonly HighlightAlert[];
  /** Completed games in the period. */
  sessions: number;
  activeDays: number;
  periodDays: number;
  /** Score change against the previous period, or null when there is too little to compare. */
  scoreTrend: 'up' | 'down' | 'steady' | null;
  remindersTaken: number;
  remindersDecided: number;
};

const MAX_LINES = 3;

export function progressHighlights(x: HighlightInput): Highlight[] {
  const out: Highlight[] = [];
  for (const a of x.alerts.slice(0, 2)) {
    const status = a.serious ? 'urgent' : 'soon';
    if (a.kind === 'game_decline') out.push({ status, key: 'gameDecline', params: { gameId: a.gameId } });
    if (a.kind === 'adherence_low') out.push({ status, key: 'adherenceLow', params: { pct: a.ratePct } });
    if (a.kind === 'inactive') out.push({ status, key: 'inactive', params: { days: a.days } });
  }
  const hasGameAlert = x.alerts.some((a) => a.kind !== 'adherence_low');
  if (x.sessions === 0) {
    if (!hasGameAlert) out.push({ status: 'info', key: 'noGames' });
  } else {
    if (!hasGameAlert && x.scoreTrend === 'up') out.push({ status: 'well', key: 'scoresUp' });
    if (!hasGameAlert && (x.scoreTrend === 'steady' || x.scoreTrend == null))
      out.push({ status: 'well', key: 'scoresSteady' });
    if (!hasGameAlert && x.scoreTrend === 'down') out.push({ status: 'info', key: 'scoresDown' });
    out.push({
      status: x.activeDays * 2 >= x.periodDays ? 'well' : 'info',
      key: 'played',
      params: { n: x.activeDays, d: x.periodDays },
    });
  }
  if (x.remindersDecided > 0 && !x.alerts.some((a) => a.kind === 'adherence_low')) {
    out.push({
      status: x.remindersTaken * 4 >= x.remindersDecided * 3 ? 'well' : 'info',
      key: 'reminders',
      params: { taken: x.remindersTaken, decided: x.remindersDecided },
    });
  }
  return out.slice(0, MAX_LINES);
}
