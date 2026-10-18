'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';
import { authClient } from '../lib/auth-client';
import { useSignal } from '../lib/store';
import { Button } from './ui/button';
export function NotificationPreferences({ notify }: { notify: (s: string) => void }) {
  const s = useSignal(),
    [enabled, setEnabled] = useState(true),
    [quietStart, setStart] = useState(''),
    [quietEnd, setEnd] = useState(''),
    [timezone, setTimezone] = useState('UTC');
  const { data: session } = authClient.useSession();
  const { data } = useQuery({
    queryKey: ['preferences', session?.user.id],
    queryFn: () => api('preferences'),
    enabled: !!session,
  });
  useEffect(() => {
    if (data) {
      setEnabled(data.alerts_enabled ?? true);
      setStart(
        data.quiet_start === null || data.quiet_start === undefined ? '' : String(data.quiet_start),
      );
      setEnd(data.quiet_end === null || data.quiet_end === undefined ? '' : String(data.quiet_end));
      setTimezone(data.timezone ?? 'UTC');
    }
  }, [data]);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api('preferences', {
            method: 'PATCH',
            body: JSON.stringify({
              locale: s.locale,
              theme: s.theme,
              alertsEnabled: enabled,
              quietStart: quietStart === '' ? null : Number(quietStart),
              quietEnd: quietEnd === '' ? null : Number(quietEnd),
              timezone,
            }),
          });
          notify('Notification preferences saved.');
        } catch (e) {
          notify((e as Error).message);
        }
      }}
    >
      <label className="check-label">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        In-app watchlist alerts
      </label>
      <div className="two-column">
        <label>
          Quiet hours from
          <select
            aria-label="Quiet hours from"
            value={quietStart}
            onChange={(e) => setStart(e.target.value)}
          >
            <option value="">No quiet hours</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option value={h} key={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
        <label>
          Quiet hours until
          <select
            aria-label="Quiet hours until"
            value={quietEnd}
            onChange={(e) => setEnd(e.target.value)}
          >
            <option value="">No quiet hours</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option value={h} key={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Timezone
        <input
          required
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="Europe/Zurich"
        />
      </label>
      <p className="muted">
        Quiet-hour matches are suppressed, not delivered later. Maximum 50 notifications per hour.
      </p>
      <Button type="submit">Save preferences</Button>
    </form>
  );
}
