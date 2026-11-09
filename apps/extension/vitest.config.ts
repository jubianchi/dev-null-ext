import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A time zone of their own, whatever the machine's: the schedule tests count on no change of clocks in the 30 days
  // after their date, and one ahead of UTC tells local time from UTC. Tests about a change of clocks set theirs.
  test: { include: ['test/**/*.test.{ts,tsx}'], environment: 'node', env: { TZ: 'Europe/Paris' } },
});
