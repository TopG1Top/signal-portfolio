'use client';
import { Watchlists } from './watchlists';
import { AdminClusters } from './admin-clusters';
import { PasswordReset } from './password-reset';
import { NotificationPreferences } from './notification-preferences';
import { isPortfolio } from '../../../packages/shared/portfolio';
import { PortfolioNotice } from './portfolio-notice';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Lock,
  Mail,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Trash2,
  User,
  RotateCcw,
} from 'lucide-react';
import { api, useEvents, useEventParams } from '../lib/client';
import { useSignal } from '../lib/store';
import { authClient } from '../lib/auth-client';
import { formatTime, type EventRecord } from '../../../packages/shared/index';
import { Button } from './ui/button';
import { Empty, ErrorState, EventCard, Filters, Loading } from './shell';
const Charts = dynamic(() => import('./visualizations').then((x) => x.Charts), { ssr: false });
const Graph = dynamic(() => import('./visualizations').then((x) => x.ConnectionGraph), {
  ssr: false,
});
const WorldMap = dynamic(() => import('./world-map'), { ssr: false });
export function Views({ route, notify }: { route: string; notify: (s: string) => void }) {
  if (
    isPortfolio &&
    ([
      '/login',
      '/register',
      '/reset-password',
      '/watchlists',
      '/saved',
      '/dashboard',
      '/notifications',
      '/assistant',
    ].includes(route) ||
      route.startsWith('/admin'))
  )
    return <PortfolioNotice />;
  if (['/live', '/search'].includes(route)) return <EventList route={route} />;
  if (route === '/sources') return <Sources />;
  if (['/analytics', '/intelligence'].includes(route))
    return <Analytics intelligence={route === '/intelligence'} />;
  if (route === '/timeline') return <Timeline />;
  if (route === '/connections') return <Connections />;
  if (route === '/reset-password') return <PasswordReset notify={notify} />;
  if (['/login', '/register'].includes(route)) return <AuthForm route={route} notify={notify} />;
  if (route === '/watchlists') return <Watchlists notify={notify} />;
  if (['/saved', '/dashboard', '/notifications'].includes(route))
    return <Personal route={route} notify={notify} />;
  if (route === '/settings') return <SettingsView notify={notify} />;
  if (route === '/assistant') return <Assistant notify={notify} />;
  if (route.startsWith('/admin')) return <Admin route={route} notify={notify} />;
  if (route === '/about') return <About />;
  return (
    <section className="standard-page">
      <PageHead
        title="Page not found"
        description="This route is not part of the SIGNAL workspace."
      />
      <Link className="btn" href="/">
        Return to command center
      </Link>
    </section>
  );
}
function PageHead({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">SIGNAL / INTELLIGENCE WORKSPACE</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function EventList({ route }: { route: string }) {
  const s = useSignal(),
    [page, setPage] = useState(1),
    data = useEvents(30, page);
  useEffect(() => setPage(1), [s.q, s.category, s.source, s.mode, s.hours]);
  return (
    <section className="standard-page">
      <PageHead
        title={route === '/search' ? 'Search the evidence' : 'Live event feed'}
        description="Original observations, traceable sources and collection timestamps."
      >
        <Button onClick={() => s.set({ paused: !s.paused })}>
          {s.paused ? <Play size={15} /> : <Pause size={15} />}{' '}
          {s.paused ? 'Resume updates' : 'Pause updates'}
        </Button>
      </PageHead>
      {route === '/search' && (
        <div className="search-large">
          <Search />
          <input
            aria-label="Search collected events"
            placeholder="Search titles and source descriptions…"
            value={s.q}
            onChange={(e) => s.set({ q: e.target.value })}
          />
          <span>Full-text search</span>
        </div>
      )}
      <Filters />
      <div className="result-meta">
        <span>
          {data.data?.total ?? '—'} collected records {s.q && `matching “${s.q}”`}
        </span>
        <span>Newest first · UTC</span>
      </div>
      {data.error ? (
        <ErrorState error={data.error} />
      ) : data.isPending ? (
        <Loading />
      ) : data.data?.items.length ? (
        <div className="event-grid">
          {data.data.items.map((e) => (
            <EventCard key={e.id} event={e} onClick={() => s.set({ selected: e.id })} />
          ))}
        </div>
      ) : (
        <Empty text="Try another keyword, source or time range." />
      )}
      <div className="pagination">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={15} />
          Previous
        </Button>
        <span>
          Page {page} of {Math.max(1, Math.ceil((data.data?.total ?? 0) / 30))}
        </span>
        <Button disabled={page * 30 >= (data.data?.total ?? 0)} onClick={() => setPage(page + 1)}>
          Next
          <ChevronRight size={15} />
        </Button>
      </div>
      {route === '/search' && (
        <p className="capability-note">
          Search currently uses PostgreSQL full-text matching. Semantic embeddings and
          natural-language filter extraction are not enabled.
        </p>
      )}
    </section>
  );
}
function Sources() {
  const { data, error, isPending } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api<any[]>('sources'),
  });
  return (
    <section className="standard-page">
      <PageHead
        title="Source network"
        description={
          isPortfolio
            ? 'Fictional sources used only to demonstrate the interface. No external news feeds.'
            : 'Public data connectors. Original attribution. Transparent collection health.'
        }
      />
      {error ? (
        <ErrorState error={error} />
      ) : isPending ? (
        <Loading />
      ) : (
        <div className="source-grid">
          {data?.map((s) => (
            <article className="source-card" key={s.id}>
              <div className="source-card-top">
                <span className="source-logo">
                  {s.id === 'usgs'
                    ? 'USGS'
                    : s.id === 'eonet' || s.id === 'nasa-rss'
                      ? 'NASA'
                      : s.id === 'tagesschau'
                        ? 'ARD'
                        : s.id === 'srf'
                          ? 'SRF'
                          : s.id === 'heise'
                            ? 'heise'
                            : s.name.slice(0, 5)}
                </span>
                <span className={`health-pill ${s.status === 'healthy' ? 'healthy' : ''}`}>
                  <i />
                  {s.enabled ? s.status : 'disabled'}
                </span>
              </div>
              <h2>{s.name}</h2>
              <p>{s.license}</p>
              <dl>
                <div>
                  <dt>Connector</dt>
                  <dd>{s.type.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Last successful import</dt>
                  <dd>{s.last_success ? formatTime(s.last_success) : 'Not yet imported'}</dd>
                </div>
                <div>
                  <dt>Polling interval</dt>
                  <dd>
                    {isPortfolio
                      ? 'No polling · synthetic data'
                      : s.poll_interval / 60 + ' minutes'}
                  </dd>
                </div>
              </dl>
              {s.error && <p className="inline-error">{s.error}</p>}
              <a href={s.endpoint} target="_blank" rel="noreferrer">
                Inspect provider endpoint <ExternalLink size={14} />
              </a>
            </article>
          ))}
        </div>
      )}
      <div className="info-panel">
        <Shield size={23} />
        <div>
          <h3>Coverage is not the whole world.</h3>
          <p>
            {isPortfolio
              ? 'Every record in this public edition is a fictional portfolio scenario. No real source claims, live reporting or independent confirmation are presented.'
              : 'Coverage includes politics, international affairs, business, IT, science, health, sport, culture and natural events. News feeds retain publisher headlines and original links. Country tags come from domestic sections or headline mentions; exact locations are not inferred. Coverage gaps do not establish that nothing happened.'}
          </p>
        </div>
      </div>
    </section>
  );
}
function Analytics({ intelligence }: { intelligence: boolean }) {
  const { mode } = useSignal();
  const filterParams = useEventParams().toString();
  const { data, error, isPending } = useQuery({
    queryKey: ['trends', filterParams],
    queryFn: () => api('analytics/trends?' + filterParams),
  });
  return (
    <section className="standard-page">
      <PageHead
        title={intelligence ? 'Intelligence overview' : 'Data analytics'}
        description="Stored reports and events, grouped by publication or event date in UTC."
      />
      <Filters />
      {error ? (
        <ErrorState error={error} />
      ) : isPending ? (
        <Loading />
      ) : (
        <>
          <section className="panel">
            <div className="panel-heading">
              <h2>Collected activity over time</h2>
              <span className="panel-tag">{mode.toUpperCase()} DATA</span>
            </div>
            <Charts data={data} />
            <p className="chart-caption">
              {data.daily[0]?.day ?? 'No records'} — {data.daily.at(-1)?.day ?? 'No records'} ·{' '}
              {data.daily.reduce((n: number, x: any) => n + x.count, 0)} records · Complete filtered
              dataset. Country, category, source, time and search filters apply.
            </p>
          </section>
          <div className="two-column">
            {[
              ['Category distribution', data.categories, 'category'],
              ['Source coverage', data.sources, 'name'],
            ].map(([title, rows, key]: any) => (
              <section className="panel breakdown" key={title}>
                <h2>{title}</h2>
                {rows.map((x: any) => (
                  <div className="breakdown-row" key={x[key]}>
                    <div>
                      <span>{x[key]}</span>
                      <strong>{x.count}</strong>
                    </div>
                    <div className="progress-track">
                      <i
                        style={{
                          width: (x.count / Math.max(...rows.map((r: any) => r.count))) * 100 + '%',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
          {intelligence && (
            <div className="info-panel">
              <Sparkles />
              <div>
                <h3>Observed volume, not real-world severity</h3>
                <p>
                  Import volume reflects source selection and polling intervals. Topic emergence and
                  media sentiment are not inferred from this limited dataset. Relevance values are
                  documented heuristics, not impact or confidence scores.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Connections() {
  const { data, error } = useEvents(50),
    s = useSignal();
  const select = useCallback((id: string) => s.set({ selected: id }), [s.set]);
  return (
    <section className="standard-page">
      <PageHead
        title="Connection graph"
        description="Explore how collected events connect to their reporting sources and categories."
      />
      <Filters />
      {error ? (
        <ErrorState error={error} />
      ) : (
        <section className="panel">
          <div className="graph-legend">
            <span>
              <i style={{ background: '#38bdf8' }} />
              Event
            </span>
            <span>
              <i style={{ background: '#818cf8' }} />
              Source
            </span>
            <span>
              <i style={{ background: '#34d399' }} />
              Topic
            </span>
            <span>Drag to explore · Scroll to zoom · Select an event</span>
          </div>
          <Graph events={data?.items ?? []} onSelect={select} />
        </section>
      )}
      <div className="info-panel">
        <NetworkIcon />
        <div>
          <h3>Relationships, with a reason</h3>
          <p>
            REPORTED_BY means the connector supplied the record. SAME_TOPIC means records share a
            category. Neither edge establishes causation or independent confirmation. The graph
            shows up to 50 filtered records.
          </p>
        </div>
      </div>
    </section>
  );
}
function NetworkIcon() {
  return <Globe size={24} />;
}
function Timeline() {
  const s = useSignal(),
    [position, setPosition] = useState(100),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [span, setSpan] = useState(24);
  const data = useEvents(100);
  const [end] = useState(Date.now());
  const start = end - span * 3600000;
  useEffect(() => {
    s.set({
      asOf:
        position === 100 ? '' : new Date(start + ((end - start) * position) / 100).toISOString(),
    });
  }, [position, start, end, s.set]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setPosition((p) => {
          if (p >= 100) {
            setPlaying(false);
            return 100;
          }
          return Math.min(100, p + speed);
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [playing, speed]);
  return (
    <section className="standard-page">
      <PageHead
        title="Historical replay"
        description="Replay only snapshots that had already been collected at the selected moment."
      />
      <div className="replay-controls">
        <Button
          aria-label={playing ? 'Pause replay' : 'Play replay'}
          onClick={() => {
            if (position === 100) setPosition(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button
          aria-label="Restart replay"
          onClick={() => {
            setPosition(0);
            setPlaying(false);
          }}
        >
          <RotateCcw size={16} />
        </Button>
        <select
          aria-label="Replay speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {[1, 2, 5, 10].map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <select
          aria-label="Replay range"
          value={span}
          onChange={(e) => setSpan(Number(e.target.value))}
        >
          <option value={1}>Hour</option>
          <option value={24}>Day</option>
          <option value={168}>Week</option>
          <option value={720}>Month</option>
        </select>
        <input
          aria-label="Replay time"
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
        />
        <time>
          {position === 100
            ? 'Latest collected state'
            : formatTime(new Date(start + ((end - start) * position) / 100).toISOString())}
        </time>
      </div>
      <WorldMap
        events={data.data?.items ?? []}
        onSelect={(id) => s.set({ selected: id })}
        height={420}
      />
      <p className="capability-note">
        Historical availability begins at the first import into this installation. Earlier provider
        occurrence dates do not imply that SIGNAL already knew about an event.
      </p>
      {data.data?.items.length ? (
        <div className="event-grid">
          {data.data.items.slice(0, 12).map((e) => (
            <EventCard key={e.id} event={e} onClick={() => s.set({ selected: e.id })} />
          ))}
        </div>
      ) : (
        <Empty text="No snapshots had been collected at this replay time." />
      )}
    </section>
  );
}
const credentials = z.object({
  name: z.string().max(80),
  email: z.email(),
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
});
function AuthForm({ route, notify }: { route: string; notify: (s: string) => void }) {
  const register = route === '/register',
    reset = route === '/reset-password';
  const [error, setError] = useState('');
  const form = useForm<z.infer<typeof credentials>>({
    resolver: zodResolver(credentials),
    defaultValues: { name: '', email: '', password: '' },
  });
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-symbol">
          <Shield size={27} />
        </div>
        <span className="eyebrow">YOUR INTELLIGENCE WORKSPACE</span>
        <h1>
          {register ? 'Create your account' : reset ? 'Reset your password' : 'Welcome to SIGNAL'}
        </h1>
        <p>Save evidence. Follow developments. Build your perspective.</p>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError('');
            try {
              const result = register
                ? await authClient.signUp.email({
                    ...values,
                    name: values.name || values.email.split('@')[0],
                  })
                : await authClient.signIn.email({ email: values.email, password: values.password });
              if (result.error) throw new Error(result.error.message);
              location.assign('/dashboard');
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          {register && (
            <label>
              Name
              <input autoComplete="name" {...form.register('name')} />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" {...form.register('email')} />
          </label>
          {!reset && (
            <label>
              Password
              <input
                aria-label="Password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                {...form.register('password')}
              />
              <small>{form.formState.errors.password?.message ?? 'At least 12 characters'}</small>
            </label>
          )}
          {error && <p className="inline-error">{error}</p>}
          {reset ? (
            <Button
              variant="default"
              type="button"
              onClick={async () => {
                const status = await api('system/status');
                if (!status.smtpConfigured) {
                  notify('Password reset requires SMTP configuration by the operator.');
                  return;
                }
                const email = form.getValues('email');
                const r = await authClient.requestPasswordReset({ email, redirectTo: '/settings' });
                notify(
                  r.error?.message ?? 'If the account exists, a reset email has been requested.',
                );
              }}
            >
              Request reset email
            </Button>
          ) : (
            <Button variant="default" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? 'Please wait…'
                : register
                  ? 'Create account'
                  : 'Sign in'}
              <ArrowRight size={15} />
            </Button>
          )}
        </form>
        <div className="auth-links">
          <Link href={register ? '/login' : '/register'}>
            {register ? 'Already have an account? Sign in' : 'New to SIGNAL? Create an account'}
          </Link>
          {!reset && <Link href="/reset-password">Forgot password?</Link>}
        </div>
        <p className="auth-note">
          <Lock size={12} />
          Secure, server-managed sessions · No public profile
        </p>
      </div>
    </div>
  );
}
function LoginPrompt() {
  return (
    <div className="login-prompt">
      <Lock size={28} />
      <h2>Your personal intelligence workspace</h2>
      <p>Sign in to manage private watchlists, saved events and notifications.</p>
      <Link className="btn btn-primary" href="/login">
        Sign in <ArrowRight size={15} />
      </Link>
      <Link href="/register">Create an account</Link>
    </div>
  );
}
function Personal({ route, notify }: { route: string; notify: (s: string) => void }) {
  const { data: session, isPending } = authClient.useSession(),
    s = useSignal(),
    qc = useQueryClient();
  const saved = useQuery({
    queryKey: ['saved', session?.user.id],
    queryFn: () => api<EventRecord[]>('saved'),
    enabled: !!session,
  });
  const alerts = useQuery({
    queryKey: ['notifications', session?.user.id],
    queryFn: () => api<any[]>('notifications'),
    enabled: !!session,
  });
  return (
    <section className="standard-page">
      <PageHead
        title={
          route === '/saved'
            ? 'Saved events'
            : route === '/notifications'
              ? 'Notifications'
              : 'My intelligence dashboard'
        }
        description="Your private research collection and watchlist developments."
      />
      {isPending ? (
        <Loading />
      ) : !session ? (
        <LoginPrompt />
      ) : (
        <>
          {route !== '/saved' && (
            <section className="panel personal-panel">
              <div className="panel-heading">
                <h2>Watchlist notifications</h2>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await api('notifications/read', { method: 'POST', body: '{}' });
                      void qc.invalidateQueries({ queryKey: ['notifications'] });
                      notify('Notifications marked as read.');
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                >
                  <Check size={13} />
                  Mark read
                </Button>
              </div>
              {alerts.error ? (
                <ErrorState error={alerts.error} />
              ) : alerts.data?.length ? (
                alerts.data.map((a) => (
                  <button
                    className={'notification ' + (!a.read ? 'unread' : '')}
                    key={a.id}
                    onClick={() => s.set({ selected: a.event_id })}
                  >
                    <Radio size={16} />
                    <div>
                      <p>{a.title}</p>
                      <small>{formatTime(a.created_at)}</small>
                    </div>
                    <ArrowRight size={15} />
                  </button>
                ))
              ) : (
                <Empty text="No matching developments yet. Create a watchlist and let future imports find relevant events." />
              )}
            </section>
          )}
          {route !== '/notifications' && (
            <>
              <div className="section-heading">
                <h2>Saved evidence</h2>
                <Link href="/watchlists">
                  Manage watchlists <ArrowRight size={14} />
                </Link>
              </div>
              {saved.error ? (
                <ErrorState error={saved.error} />
              ) : saved.data?.length ? (
                <div className="event-grid">
                  {saved.data.map((e) => (
                    <div className="saved-card" key={e.id}>
                      <EventCard event={e} onClick={() => s.set({ selected: e.id })} />
                      <button
                        className="remove-save"
                        onClick={async () => {
                          try {
                            await api('saved/' + e.id, { method: 'DELETE' });
                            void qc.invalidateQueries({ queryKey: ['saved'] });
                          } catch (error) {
                            notify((error as Error).message);
                          }
                        }}
                      >
                        Remove from saved
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Save an event from its analysis panel to keep it here." />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
function SettingsView({ notify }: { notify: (s: string) => void }) {
  const s = useSignal(),
    { data: session } = authClient.useSession(),
    [alerts, setAlerts] = useState(true);
  return (
    <section className="standard-page">
      <PageHead
        title="Workspace settings"
        description="Control your display, data mode and account."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Appearance & language</h2>
          <label>
            Theme
            <select
              value={s.theme}
              onChange={(e) => s.set({ theme: e.target.value as 'dark' | 'light' })}
            >
              <option value="dark">Dark terminal</option>
              <option value="light">Light workspace</option>
            </select>
          </label>
          <label>
            Interface language
            <select value={s.locale} onChange={(e) => s.set({ locale: e.target.value })}>
              {[
                ['en', 'English'],
                ['de', 'Deutsch'],
                ['fr', 'Français'],
                ['it', 'Italiano'],
                ['es', 'Español'],
                ['sq', 'Shqip'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Navigation is available in six languages. Detailed research views currently use English;
            original source text is preserved.
          </p>
          <label>
            Data mode
            <select
              value={s.mode}
              onChange={(e) => s.set({ mode: e.target.value as 'live' | 'demo' })}
            >
              {!isPortfolio && <option value="live">Real source records</option>}
              <option value="demo">Synthetic exercise data</option>
            </select>
          </label>
        </section>
        <section className="panel settings-panel">
          <h2>Account & privacy</h2>
          {session ? (
            <>
              <p>
                {session.user.name}
                <br />
                <span className="muted">{session.user.email}</span>
              </p>
              <NotificationPreferences notify={notify} />
              <a className="btn" href="/api/account/export">
                <Download size={14} />
                Export personal data
              </a>
              <Button
                onClick={async () => {
                  await authClient.signOut();
                  location.assign('/');
                }}
              >
                Sign out
              </Button>
              <DeleteAccount notify={notify} />
              <Link href="/admin">
                Administration <Shield size={13} />
              </Link>
            </>
          ) : (
            <LoginPrompt />
          )}
        </section>
      </div>
    </section>
  );
}
function DeleteAccount({ notify }: { notify: (s: string) => void }) {
  const [expanded, setExpanded] = useState(false),
    [password, setPassword] = useState('');
  return (
    <div className="delete-account">
      <button className="text-danger" onClick={() => setExpanded(!expanded)}>
        Delete account…
      </button>
      {expanded && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await authClient.deleteUser({ password });
            if (r.error) notify(r.error.message ?? 'Deletion failed');
            else location.assign('/');
          }}
        >
          <p>This permanently deletes your account, saved events, watchlists and notifications.</p>
          <label>
            Confirm with your password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <Button variant="danger" type="submit">
            Permanently delete my account
          </Button>
        </form>
      )}
    </div>
  );
}
function Assistant({ notify }: { notify: (s: string) => void }) {
  const { data: session } = authClient.useSession(),
    { mode, locale, set } = useSignal(),
    [question, setQuestion] = useState(''),
    [busy, setBusy] = useState(false);
  const history = useQuery({
    queryKey: ['chat-history', session?.user.id],
    queryFn: () => api<any[]>('ai/history'),
    enabled: !!session,
  });
  const answers = [...(history.data ?? [])].reverse();
  return (
    <section className="standard-page assistant-page">
      <PageHead
        title="SIGNAL assistant"
        description="Research collected evidence. Inspect every source. Keep uncertainty visible."
      />
      {!session ? (
        <LoginPrompt />
      ) : (
        <>
          <div className="assistant-intro">
            <div className="assistant-icon">
              <Sparkles size={25} />
            </div>
            <h2>A clearer view starts with a question.</h2>
            <p>
              Search the records in your workspace. Generative analysis is used only when an AI
              provider is configured.
            </p>
            <div className="suggestions">
              {['Alaska earthquakes', 'NASA research', 'wildfire'].map((q) => (
                <button key={q} onClick={() => setQuestion(q)}>
                  {q}
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>
          <div className="chat-results">
            {history.isPending && <Loading />}
            {history.error && <ErrorState error={history.error} />}
            {answers.map((a, i) => (
              <article key={i} className="panel answer">
                <span className="eyebrow">
                  {a.role === 'user'
                    ? 'YOUR QUESTION'
                    : a.provider === 'retrieval-only'
                      ? 'EVIDENCE RETRIEVAL · NO GENERATIVE MODEL'
                      : 'AI-GENERATED · CHECK CITED EVIDENCE'}
                  {' · '}
                  {a.mode === 'demo'
                    ? 'SYNTHETIC DEMO'
                    : a.mode === 'live'
                      ? 'REAL DATA'
                      : 'EARLIER SESSION'}
                </span>
                <p>{a.content}</p>
                {(a.citations ?? []).map((c: any, j: number) => (
                  <button className="citation" key={j} onClick={() => set({ selected: c.eventId })}>
                    <span>{j + 1}</span>
                    {c.quote}
                    <ExternalLink size={13} />
                  </button>
                ))}
                <div className="uncertainty">{(a.uncertainties ?? []).join(' ')}</div>
              </article>
            ))}
          </div>
          <form
            className="assistant-composer"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await fetch('/api/ai/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: question, mode, locale }),
                });
                if (!r.ok) {
                  const e = await r.json();
                  throw new Error(e.error);
                }
                const text = await r.text();
                const line = text.split('\n').find((l) => l.startsWith('data: '));
                if (!line) throw new Error('Empty response');
                await history.refetch();
                setQuestion('');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Search size={19} />
            <input
              required
              minLength={2}
              maxLength={2000}
              aria-label="Ask SIGNAL"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about the collected evidence…"
            />
            <Button variant="default" disabled={busy} type="submit" aria-label="Send question">
              {busy ? 'Retrieving…' : <Send size={17} />}
            </Button>
          </form>
          <p className="capability-note">
            The assistant cannot execute SQL or administrative actions. Source text is treated as
            untrusted evidence. Responses are retained in your private account history.
          </p>
        </>
      )}
    </section>
  );
}
function Admin({ route, notify }: { route: string; notify: (s: string) => void }) {
  const { data: session } = authClient.useSession();
  const endpoint = route === '/admin' ? 'admin/monitoring' : route.slice(1),
    qc = useQueryClient();
  const { data, error, isPending } = useQuery({
    queryKey: ['admin', session?.user.id, endpoint],
    queryFn: () => api(endpoint),
  });
  return (
    <section className="standard-page">
      <PageHead
        title="Administration"
        description="Server-enforced administrator access. Mutations are recorded in the audit log."
      />
      <div className="admin-tabs">
        {['monitoring', 'sources', 'jobs', 'events', 'users', 'audit'].map((x) => (
          <Link key={x} className={endpoint === 'admin/' + x ? 'active' : ''} href={'/admin/' + x}>
            {x}
          </Link>
        ))}
      </div>
      {error ? (
        <ErrorState error={error} />
      ) : isPending ? (
        <Loading />
      ) : endpoint === 'admin/sources' ? (
        <div className="source-grid">
          {data.map((s: any) => (
            <div className="panel settings-panel" key={s.id}>
              <h2>{s.name}</h2>
              <p>
                {s.status} · {s.enabled ? 'Enabled' : 'Disabled'}
              </p>
              {s.type !== 'synthetic' && (
                <>
                  <Button
                    onClick={async () => {
                      try {
                        notify('Import started.');
                        await api('admin/import', {
                          method: 'POST',
                          body: JSON.stringify({ sourceId: s.id }),
                        });
                        void qc.invalidateQueries();
                        notify('Import finished.');
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    <RefreshCw size={14} />
                    Import now
                  </Button>
                  <Button
                    onClick={async () => {
                      await api('admin/sources/' + s.id, {
                        method: 'PATCH',
                        body: JSON.stringify({ enabled: !s.enabled }),
                      });
                      void qc.invalidateQueries({ queryKey: ['admin'] });
                    }}
                  >
                    {s.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel admin-data">
          <h2>{endpoint.split('/')[1]}</h2>
          {endpoint === 'admin/events' && <AdminClusters notify={notify} />}
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
function About() {
  if (isPortfolio)
    return (
      <section className="standard-page about-page">
        <PageHead
          title="SIGNAL · Portfolio project"
          description="Programmiert von Linhard Zejneli. A non-commercial demonstration of event intelligence interfaces."
        />
        <div className="two-column">
          <section className="panel settings-panel">
            <h2>Fictional scenarios, real interactions</h2>
            <p>
              The public edition runs without PostgreSQL, Redis, account registration or live news
              ingestion. Every report is explicitly synthetic. Titles, updates, relevance scores and
              relative timestamps illustrate interface behavior and are not factual reporting.
            </p>
            <h3>What you can explore</h3>
            <p>
              Country/topic/source filters, interactive map points and country shading, search,
              timeline snapshots, source/topic graph, responsive layouts and database-free
              analytics.
            </p>
            <h3>Geography</h3>
            <p>
              Country shading illustrates synthetic country context. Point coordinates are training
              locations. Natural Earth boundaries are public domain; map labels currently load from
              MapLibre’s public glyph endpoint.
            </p>
          </section>
          <section className="panel settings-panel">
            <h2>Technology & authorship</h2>
            <p>
              Next.js, React, TypeScript, MapLibre, ECharts and Cytoscape power this interactive
              portfolio. The full source also contains an optional database-backed local edition
              with ingestion, authentication and private user features.
            </p>
            <p>
              <strong>Programmiert von Linhard Zejneli</strong>
            </p>
            <h3>Data handling</h3>
            <p>
              No application accounts or private research are stored on a server in this edition.
              Display preferences are stored locally in your browser. The hosting provider processes
              requests to serve the site; the external map-font provider receives font requests.
            </p>
            <Link className="btn" href="/">
              Explore SIGNAL
            </Link>
          </section>
        </div>
      </section>
    );
  return (
    <section className="standard-page about-page">
      <PageHead
        title="Intelligence you can inspect."
        description="SIGNAL brings public event records into a shared geographic and temporal context."
      />
      <div className="two-column">
        <section className="panel settings-panel">
          <Shield className="cyan" size={28} />
          <h2>Evidence before interpretation</h2>
          <p>
            Every event links to a provider record. Source-reported facts are not presented as
            independently verified. No fictional news, silent demo data, or simulated live activity
            is mixed into real data mode.
          </p>
          <h3>Coverage & limitations</h3>
          <p>
            SRF, tagesschau and heise provide headline feeds covering politics, business, IT,
            science, health, sport and culture. USGS and NASA add natural-event and space data. This
            installation is a local personal reader with original-source links; publisher rights
            apply. Coverage is selective. Relevance is a ranking heuristic.
          </p>
          <h3>Geography & time</h3>
          <p>
            Coordinates come from providers. Events without point geometry are not assigned invented
            locations. Country shading shows editorial country context from a domestic section or an
            explicit headline reference. News uses publication dates. Historical replay uses
            collection time and versioned snapshots.
          </p>
        </section>
        <section className="panel settings-panel">
          <h2>Privacy & data handling</h2>
          <p>
            Accounts store an email address, name, hashed credentials, sessions and user-selected
            research preferences. No public profile or personal surveillance graph is created.
            Export and deletion are available in settings.
          </p>
          <p>
            The operator must configure retention, backups, production HTTPS and a
            deployment-specific privacy notice before opening registration publicly. This project
            does not claim legal certification.
          </p>
          <h3>Data acknowledgements</h3>
          <a
            href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/"
            target="_blank"
            rel="noreferrer"
          >
            USGS Earthquake Hazards <ExternalLink size={13} />
          </a>
          <a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noreferrer">
            NASA EONET <ExternalLink size={13} />
          </a>
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth public-domain map boundaries <ExternalLink size={13} />
          </a>
          <p className="muted">
            Map boundaries are cartographic data, not an assertion about disputed territorial
            status.
          </p>
        </section>
      </div>
    </section>
  );
}
