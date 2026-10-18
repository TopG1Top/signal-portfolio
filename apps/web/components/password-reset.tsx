'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '../lib/auth-client';
import { api } from '../lib/client';
import { Button } from './ui/button';
export function PasswordReset({ notify }: { notify: (s: string) => void }) {
  const [token, setToken] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => setToken(new URLSearchParams(location.search).get('token') ?? ''), []);
  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>{token ? 'Choose a new password' : 'Reset your password'}</h1>
        <p>
          {token
            ? 'Use a unique passphrase with at least 12 characters.'
            : 'An email will contain a time-limited reset link.'}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              if (token) {
                const r = await authClient.resetPassword({ newPassword: password, token });
                if (r.error) throw new Error(r.error.message);
                notify('Password changed. You can now sign in.');
                location.assign('/login');
              } else {
                const status = await api('system/status');
                if (!status.smtpConfigured)
                  throw new Error('Password reset requires SMTP configuration by the operator.');
                const r = await authClient.requestPasswordReset({
                  email,
                  redirectTo: '/reset-password',
                });
                if (r.error) throw new Error(r.error.message);
                notify('If the account exists, a reset email has been requested.');
              }
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {token ? (
            <label>
              New password
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          ) : (
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <Button variant="default" disabled={busy} type="submit">
            {busy ? 'Please wait…' : token ? 'Reset password' : 'Request reset email'}
          </Button>
        </form>
        <div className="auth-links">
          <Link href="/login">Return to sign in</Link>
        </div>
      </section>
    </div>
  );
}
