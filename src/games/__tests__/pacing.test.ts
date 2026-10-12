import { afterSpeech } from '../pacing';

describe('afterSpeech', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for the speech even when it outlasts the minimum delay', async () => {
    let finishSpeech!: () => void;
    const speech = new Promise<void>((r) => (finishSpeech = r));
    let done = false;
    const p = afterSpeech(speech, 500).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(2000);
    expect(done).toBe(false);
    finishSpeech();
    await p;
    expect(done).toBe(true);
  });

  it('waits for the minimum delay even when speech is instant', async () => {
    let done = false;
    const p = afterSpeech(Promise.resolve(), 1000).then(() => (done = true));
    await jest.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });
});
