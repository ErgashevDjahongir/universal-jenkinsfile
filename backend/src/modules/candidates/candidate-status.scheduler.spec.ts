import { CandidateStatusScheduler } from './candidate-status.scheduler';

describe('CandidateStatusScheduler.expireCandidates', () => {
  function build(reconcile: jest.Mock): CandidateStatusScheduler {
    return new CandidateStatusScheduler({
      reconcileExpiredCandidates: reconcile,
    } as never);
  }

  it('biznes-logikani service ga topshiradi', async () => {
    const reconcile = jest.fn().mockResolvedValue(3);
    const scheduler = build(reconcile);

    await scheduler.expireCandidates();

    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it('hech nima o‘zgarmasa ham xatosiz tugaydi', async () => {
    const reconcile = jest.fn().mockResolvedValue(0);
    const scheduler = build(reconcile);

    await expect(scheduler.expireCandidates()).resolves.toBeUndefined();
  });
});
