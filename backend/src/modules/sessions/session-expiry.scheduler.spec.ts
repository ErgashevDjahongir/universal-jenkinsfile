import { SessionExpiryScheduler } from './session-expiry.scheduler';
import { SessionsService } from './sessions.service';

describe('SessionExpiryScheduler', () => {
  it("expireOverdue → servisning expireOverdueSessions'ini chaqiradi", async () => {
    const sessions = { expireOverdueSessions: jest.fn().mockResolvedValue(3) };
    const scheduler = new SessionExpiryScheduler(sessions as unknown as SessionsService);

    await scheduler.expireOverdue();

    expect(sessions.expireOverdueSessions).toHaveBeenCalledTimes(1);
  });
});
