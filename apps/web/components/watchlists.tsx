'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/client';
import { authClient } from '../lib/auth-client';
import { Button } from './ui/button';
import { Empty, ErrorState, Loading } from './shell';
type Watchlist = {
  id: string;
  name: string;
  keywords: string;
  category: string;
  source: string;
  enabled: boolean;
};
const blank = { name: '', keywords: '', category: '', source: '', enabled: true };
export function Watchlists({ notify }: { notify: (s: string) => void }) {
  const { data: session, isPending } = authClient.useSession(),
    qc = useQueryClient();
  const [form, setForm] = useState(blank),
    [editing, setEditing] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const lists = useQuery({
    queryKey: ['watchlists', session?.user.id],
    queryFn: () => api<Watchlist[]>('watchlists'),
    enabled: !!session,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ id: string }[]>('categories'),
  });
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: () => api<{ id: string; name: string }[]>('sources'),
  });
  async function mutate(path: string, method: string, value?: unknown) {
    try {
      await api(path, { method, body: value ? JSON.stringify(value) : undefined });
      await qc.invalidateQueries({ queryKey: ['watchlists'] });
      notify('Watchlist updated.');
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  }
  return (
    <section className="standard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SIGNAL / PERSONAL INTELLIGENCE</span>
          <h1>Watchlists</h1>
          <p>Get in-app notifications when subsequent imports match your interests.</p>
        </div>
      </div>
      {isPending ? (
        <Loading />
      ) : !session ? (
        <div className="login-prompt">
          <h2>Your private observation lists</h2>
          <p>Sign in to save watchlists to your account.</p>
          <Link className="btn btn-primary" href="/login">
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <form
            className="watch-form panel"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const success = await mutate(
                editing ? 'watchlists/' + editing : 'watchlists',
                editing ? 'PATCH' : 'POST',
                form,
              );
              setBusy(false);
              if (success) {
                setEditing(null);
                setForm(blank);
              }
            }}
          >
            <label>
              Watchlist name
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My research watchlist"
              />
            </label>
            <label>
              Keyword or phrase
              <input
                maxLength={300}
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="e.g. Alaska"
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">All categories</option>
                {categories.data?.map((c) => (
                  <option key={c.id}>{c.id}</option>
                ))}
              </select>
            </label>
            <label>
              Source
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="">All sources</option>
                {sources.data?.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="default" type="submit" disabled={busy}>
              <Plus size={15} />
              {editing ? 'Save changes' : 'Create watchlist'}
            </Button>
            {editing && (
              <Button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                <X size={14} />
                Cancel edit
              </Button>
            )}
          </form>
          {lists.error ? (
            <ErrorState error={lists.error} />
          ) : lists.data?.length ? (
            <div className="source-grid">
              {lists.data.map((w) => (
                <article className="watch-card panel" key={w.id}>
                  <span className={`health-pill ${w.enabled ? 'healthy' : ''}`}>
                    {w.enabled ? 'Active' : 'Paused'}
                  </span>
                  <h2>{w.name}</h2>
                  <p>
                    {w.keywords || 'Any keyword'} · {w.category || 'All categories'}
                  </p>
                  <div className="detail-actions">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditing(w.id);
                        setForm({
                          name: w.name,
                          keywords: w.keywords,
                          category: w.category,
                          source: w.source,
                          enabled: w.enabled,
                        });
                      }}
                    >
                      <Pencil size={13} />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        void mutate('watchlists/' + w.id, 'PATCH', { ...w, enabled: !w.enabled })
                      }
                    >
                      {w.enabled ? <Pause size={13} /> : <Play size={13} />}{' '}
                      {w.enabled ? 'Pause' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        void mutate('watchlists', 'POST', {
                          ...w,
                          name: w.name.slice(0, 70) + ' copy',
                        })
                      }
                    >
                      <Copy size={13} />
                      Duplicate
                    </Button>
                    <Button
                      size="icon"
                      aria-label={'Delete ' + w.name}
                      onClick={() => void mutate('watchlists/' + w.id, 'DELETE')}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty text="Create a watchlist to receive notifications on future matching imports." />
          )}
          <p className="capability-note">
            Notifications apply to subsequent live imports. E-mail alerts, web push and hourly/daily
            digests are not yet enabled. Quiet hours are configured in Settings.
          </p>
        </>
      )}
    </section>
  );
}
