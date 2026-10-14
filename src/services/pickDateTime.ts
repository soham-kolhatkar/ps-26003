import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

/**
 * Pick a date or a time: the native Android picker on phones; a plain prompt
 * (HH:MM / YYYY-MM-DD) in the browser, which is only our Chromium test bed.
 */
export function pickDateTime(
  value: Date,
  mode: 'date' | 'time',
  onPicked: (date: Date) => void,
  minimumDate?: Date,
): void {
  if (Platform.OS !== 'web') {
    DateTimePickerAndroid.open({ value, mode, minimumDate, onValueChange: (_event, date) => onPicked(date) });
    return;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const current =
    mode === 'time'
      ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const answer = globalThis.prompt?.(mode === 'time' ? 'Time (HH:MM)' : 'Date (YYYY-MM-DD)', current);
  if (!answer) return;
  const d = new Date(value);
  const t = /^(\d{1,2}):(\d{2})$/.exec(answer.trim());
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(answer.trim());
  if (mode === 'time' && t) d.setHours(Number(t[1]), Number(t[2]), 0, 0);
  else if (mode === 'date' && day) d.setFullYear(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  else return;
  onPicked(d);
}
