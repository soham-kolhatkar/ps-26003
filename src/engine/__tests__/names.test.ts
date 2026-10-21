import { greetingName } from '@/engine/names';

describe('greetingName', () => {
  it('keeps a doctor title with the first name', () => {
    expect(greetingName('Dr. Anjali Mehta')).toBe('Dr. Anjali');
    expect(greetingName('Dr Anjali')).toBe('Dr Anjali');
  });

  it('uses the first name otherwise', () => {
    expect(greetingName('Sunita Devi')).toBe('Sunita');
    expect(greetingName('  Priya  ')).toBe('Priya');
  });
});
