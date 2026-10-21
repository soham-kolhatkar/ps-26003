/** "Dr. Anjali Mehta" → "Dr. Anjali"; "Sunita Devi" → "Sunita" (staff greetings). */
export function greetingName(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  return /^dr\.?$/i.test(first ?? '') && second ? `${first} ${second}` : (first ?? '');
}
