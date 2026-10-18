'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Earth,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Menu,
  Network,
  Pause,
  Play,
  Radio,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
  Wifi,
  WifiOff,
  X,
  BarChart3,
  Focus,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { useSignal } from '../lib/store';
import { api, useEvents, useEventParams } from '../lib/client';
import { authClient } from '../lib/auth-client';
import { categoryColors, formatTime, type EventRecord } from '../../../packages/shared/index';
import { countryName } from '../../../packages/shared/countries';
import { isPortfolio } from '../../../packages/shared/portfolio';
import { Button } from './ui/button';
import { Views } from './views';
const WorldMap = dynamic(() => import('./world-map'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Globe size={34} />
      <span>Initializing observation map…</span>
    </div>
  ),
});
const nav = [
  ['/', 'command', LayoutDashboard],
  ['/map', 'map', Earth],
  ['/live', 'live', Radio],
  ['/timeline', 'timeline', Clock],
  ['/connections', 'connections', Network],
  ['/intelligence', 'intelligence', Sparkles],
  ['/analytics', 'analytics', BarChart3],
  ['/sources', 'sources', Globe],
  ['/assistant', 'assistant', AudioLines],
] as const;
export function Shell({ route }: { route: string }) {
  const t = useTranslations(),
    router = useRouter(),
    store = useSignal(),
    { set, mode, paused, focus, selected } = store;
  const qc = useQueryClient();
  const reducedMotion = useReducedMotion();
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [connected, setConnected] = useState(false),
    [toast, setToast] = useState('');
  const { data: session } = authClient.useSession();
  const events = useEvents(100);
  const filterParams = useEventParams().toString();
  const stats = useQuery({
    queryKey: ['overview', filterParams],
    queryFn: () => api('analytics/overview?' + filterParams),
  });
  const [search, setSearch] = useState('');
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 4500);
  };
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.has('q')) set({ q: p.get('q') ?? '' });
    if (p.get('mode') === 'demo') set({ mode: 'demo' });
    if (p.has('category')) set({ category: p.get('category') ?? '' });
    if (p.has('country')) set({ country: p.get('country')?.toUpperCase() ?? '' });
    if (p.has('source')) set({ source: p.get('source') ?? '' });
    if (isPortfolio) set({ mode: 'demo' });
  }, [set]);
  useEffect(() => {
    if (isPortfolio) {
      setConnected(false);
      return;
    }
    if (paused) {
      setConnected(false);
      return;
    }
    const es = new EventSource('/api/stream/events?mode=' + mode);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    es.onopen = () => {
      setConnected(true);
      update();
    };
    es.onerror = () => setConnected(false);
    const update = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        for (const key of [
          'events',
          'event',
          'overview',
          'activity',
          'notifications',
          'countries',
          'trends',
        ])
          void qc.invalidateQueries({ queryKey: [key] });
      }, 250);
    };
    for (const type of [
      'event.created',
      'event.updated',
      'event.corrected',
      'event.merged',
      'event.resolved',
    ])
      es.addEventListener(type, update);
    return () => {
      es.close();
      clearTimeout(refreshTimer);
    };
  }, [mode, paused, qc]);
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (e.key === 'Escape') {
        set({ selected: null });
        setMobile(false);
      }
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [set]);
  useEffect(() => {
    setMobile(false);
    if (route !== '/timeline') set({ asOf: '' });
  }, [route, set]);
  const detailId = route.startsWith('/events/') ? decodeURIComponent(route.split('/')[2]) : null;
  return (
    <div className={`app ${collapsed ? 'collapsed' : ''} ${focus ? 'focus-mode' : ''}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!focus && (
        <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
          <Link href="/" className="brand">
            <span className="brand-icon">
              <AudioLines size={25} />
            </span>
            <span>
              SIGNAL<span className="brand-dot">.</span>
            </span>
          </Link>
          <div className="workspace">
            <span className="workspace-icon">
              <Globe size={16} />
            </span>
            <div>
              Global workspace<small>Public intelligence</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="nav-label">EXPLORE</div>
          <nav>
            {nav.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${route === href ? 'active' : ''}`}
                title={t(label)}
              >
                <Icon size={17} />
                <span>{t(label)}</span>
                {label === 'live' && <i className="tiny-live" />}
                {label === 'assistant' && <small className="new-badge">AI</small>}
              </Link>
            ))}
          </nav>
          <div className="nav-label personal-label">
            {isPortfolio ? 'FULL EDITION FEATURES' : 'YOUR INTELLIGENCE'}
          </div>
          <nav>
            {[
              ['/dashboard', 'dashboard', LayoutDashboard],
              ['/watchlists', 'watchlists', Compass],
              ['/saved', 'saved', Bookmark],
            ].map(([href, label, Icon]) => {
              const C = Icon as typeof Bookmark;
              return (
                <Link
                  key={String(href)}
                  href={String(href)}
                  className={`nav-item ${route === href ? 'active' : ''}`}
                >
                  <C size={17} />
                  <span>{t(String(label))}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="system-mini">
              <span className={connected ? 'status-dot' : 'status-dot warning'} />
              <div>
                {isPortfolio
                  ? 'Portfolio demo'
                  : connected
                    ? 'Event stream connected'
                    : paused
                      ? 'Updates paused'
                      : 'Connecting to stream'}
                <small>
                  {isPortfolio
                    ? 'Synthetic scenarios · No live imports'
                    : 'Traceable. Source by source.'}
                </small>
              </div>
            </div>
            <Link href="/settings" className="nav-item">
              <Settings size={17} />
              <span>{t('settings')}</span>
            </Link>
            <Link href="/about" className="nav-item">
              <Shield size={17} />
              <span>About & methodology</span>
            </Link>
            <button
              className="collapse-button"
              onClick={() => setCollapsed(!collapsed)}
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
              <span>Collapse sidebar</span>
            </button>
          </div>
        </aside>
      )}
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            WORKSPACE <ChevronRight size={12} />{' '}
            <span>
              {route === '/'
                ? 'Command center'
                : route.split('/')[1].replace(/^./, (s) => s.toUpperCase())}
            </span>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: search });
              router.push('/search');
            }}
          >
            <Search size={16} />
            <input
              id="global-search"
              aria-label="Global search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="top-actions">
            <span className="stream-status">
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>
                {isPortfolio
                  ? 'PORTFOLIO DEMO'
                  : connected
                    ? 'CONNECTED'
                    : paused
                      ? 'PAUSED'
                      : 'CONNECTING'}
              </span>
            </span>
            <select
              aria-label="Language"
              value={store.locale}
              onChange={(e) => set({ locale: e.target.value })}
            >
              {['en', 'de', 'fr', 'it', 'es', 'sq'].map((x) => (
                <option key={x} value={x}>
                  {x.toUpperCase()}
                </option>
              ))}
            </select>
            <Link href="/notifications" className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </Link>
            <Link
              href={isPortfolio ? '/about' : session ? '/settings' : '/login'}
              className="avatar"
              aria-label={isPortfolio ? 'About this project' : session ? 'Profile' : 'Sign in'}
            >
              {session?.user.name?.slice(0, 2).toUpperCase() ?? 'G'}
            </Link>
          </div>
        </header>
        {(isPortfolio || mode === 'demo') && (
          <div className="demo-banner">
            SYNTHETIC DEMO — All displayed events and statistics in this mode are illustrative
            exercises, not news.
            {isPortfolio ? (
              <Link href="/about">
                About this portfolio <ArrowRight size={13} />
              </Link>
            ) : (
              <button onClick={() => set({ mode: 'live' })}>
                Return to real data <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
        <main id="main">
          {route === '/' || route === '/map' ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="status-dot" />
                    GLOBAL EVENT INTELLIGENCE
                  </div>
                  <h1>
                    {t('global')}
                    <span className="live-pill">{mode === 'demo' ? 'DEMO' : 'SOURCE DATA'}</span>
                  </h1>
                  <p>
                    {t('subtitle')} <span className="heading-note">Your world, in context.</span>
                  </p>
                </div>
                <div className="heading-actions">
                  <Button
                    size="sm"
                    onClick={() => {
                      void qc.invalidateQueries();
                      notify('Refreshing stored source records.');
                    }}
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const p = new URLSearchParams({
                        mode,
                        category: store.category,
                        q: store.q,
                        country: store.country,
                        source: store.source,
                      });
                      void navigator.clipboard
                        .writeText(location.origin + '/?' + p)
                        .then(() => notify('Public filter link copied.'))
                        .catch(() => notify('Copy unavailable in this browser.'));
                    }}
                  >
                    <Link2 size={14} />
                    Share view
                  </Button>
                  <Button
                    size="icon"
                    aria-label="Toggle focus mode"
                    onClick={() => set({ focus: !focus })}
                  >
                    <Focus size={16} />
                  </Button>
                </div>
              </div>
              <div className="metrics">
                <Metric
                  label="EVENTS COLLECTED"
                  value={stats.data?.total}
                  icon={<Activity size={17} />}
                  sub="Across connected public sources"
                />
                <Metric
                  label="DEVELOPING EVENTS"
                  value={stats.data?.developing}
                  icon={<Radio size={17} />}
                  sub="Provider-reported open events"
                />
                <Metric
                  label="COUNTRY CONTEXTS"
                  value={stats.data?.countries}
                  icon={<Globe size={17} />}
                  sub="Countries referenced in selected reports"
                />
                <Metric
                  label="CONNECTED SOURCES"
                  value={stats.data?.sources}
                  icon={<Network size={17} />}
                  sub={
                    stats.data?.latest
                      ? 'Updated ' + formatTime(stats.data.latest)
                      : 'Awaiting first successful import'
                  }
                />
              </div>
              <Filters />
              <div className="command-grid">
                <section className="map-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="status-dot" />
                      <h2>World activity</h2>
                      <span className="subtle">
                        / {mode === 'demo' ? 'synthetic scenarios' : 'source observations'}
                      </span>
                    </div>
                    <span className="panel-tag">
                      {store.hours ? store.hours + 'H' : 'ALL COLLECTED'}
                    </span>
                  </div>
                  <WorldMap
                    events={events.data?.items ?? []}
                    onSelect={(id) => set({ selected: id })}
                  />
                  <div className="map-footer">
                    <span>
                      <Shield size={12} />
                      Locations are source-reported estimates
                    </span>
                    <span>
                      Unmapped records remain in the feed <ArrowDownRight size={12} />
                    </span>
                  </div>
                </section>
                <section className="intelligence-panel">
                  <div className="panel-heading">
                    <div>
                      <Radio size={15} className="cyan" />
                      <h2>Intelligence feed</h2>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={paused ? 'Resume live updates' : 'Pause live updates'}
                      onClick={() => set({ paused: !paused })}
                    >
                      {paused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                  </div>
                  <div className="feed-tabs">
                    <button className="active">
                      Latest events <span>{events.data?.total ?? '—'}</span>
                    </button>
                    <Link href="/saved">
                      Saved <Bookmark size={13} />
                    </Link>
                  </div>
                  <div className="compact-feed">
                    {events.isPending ? (
                      <Loading />
                    ) : events.error ? (
                      <ErrorState error={events.error} />
                    ) : !events.data?.items.length ? (
                      <Empty text="No events match these filters." />
                    ) : (
                      events.data.items
                        .slice(0, 20)
                        .map((e) => (
                          <EventCard key={e.id} event={e} onClick={() => set({ selected: e.id })} />
                        ))
                    )}
                  </div>
                  <Link className="feed-all" href="/live">
                    Explore all events <ArrowRight size={14} />
                  </Link>
                </section>
              </div>
              <ActivityStrip events={events.data?.items ?? []} />
              <div className="bottom-grid">
                <div className="coverage-card">
                  <div>
                    <span className="eyebrow">SOURCE TRANSPARENCY</span>
                    <h3>Every signal has a source.</h3>
                    <p>
                      Inspect original reports, collection times and revisions. One source is one
                      report — independent confirmation is never assumed.
                    </p>
                    <Link href="/sources">
                      Explore the source network <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="source-orbit">
                    <Globe size={44} />
                    <span>{isPortfolio ? 'DEMO' : 'SRF'}</span>
                    <span>{isPortfolio ? 'SAMPLE' : 'heise'}</span>
                  </div>
                </div>
                <div className="brief-card">
                  <span className="eyebrow">RESEARCH WORKSPACE</span>
                  <h3>From observation to understanding.</h3>
                  <p>
                    Search the collected evidence and explore related events with a source-grounded
                    research assistant.
                  </p>
                  <Link href="/assistant">
                    Open assistant <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </>
          ) : detailId ? (
            <EventDetail id={detailId} notify={notify} />
          ) : (
            <Views route={route} notify={notify} />
          )}
        </main>
        <footer className="app-footer">
          <span>
            <AudioLines size={13} /> SIGNAL{' '}
            <span className="muted">See the world as it happens.</span>
          </span>
          <span>Source records · UTC timestamps · No inferred confirmation</span>
          <span className="developer-credit">
            Programmiert von <strong>Linhard Zejneli</strong>
          </span>
          <Link href="/about">
            Methodology <ExternalLink size={11} />
          </Link>
        </footer>
      </div>
      {focus && (
        <button className="exit-focus btn" onClick={() => set({ focus: false })}>
          Exit focus mode <X size={14} />
        </button>
      )}
      {selected && !detailId && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) set({ selected: null });
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="detail-scrim radix-scrim" />
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.aside
                initial={{ x: reducedMotion ? 0 : 80, opacity: reducedMotion ? 1 : 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="detail-drawer radix-drawer"
              >
                <div className="drawer-top">
                  <Dialog.Title className="drawer-title">Event details</Dialog.Title>
                  {toast && (
                    <div className="toast" role="status">
                      {toast}
                    </div>
                  )}
                  <button
                    className="icon-button"
                    aria-label="Close event details"
                    autoFocus
                    onClick={() => set({ selected: null })}
                  >
                    <X size={20} />
                  </button>
                </div>
                <EventDetail id={selected} notify={notify} compact />
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      {toast && !selected && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value?: number;
  icon: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <strong>{value === undefined ? '—' : value.toLocaleString('en-US')}</strong>
      <div className="metric-sub">
        <span className="mini-line" />
        {sub}
      </div>
    </div>
  );
}
export function Filters() {
  const s = useSignal(),
    t = useTranslations();
  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ id: string }[]>('categories'),
  });
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: () => api<{ id: string; name: string }[]>('sources'),
  });
  const countries = useQuery({
    queryKey: ['countries', s.mode],
    queryFn: () =>
      api<{ code: string; name: string; nameDe: string; count: number }[]>(
        'countries?mode=' + s.mode,
      ),
  });
  const countryOptions = [...(countries.data ?? [])].sort((a, b) => {
    const rank = (code: string) => (code === 'CH' ? 0 : code === 'DE' ? 1 : 2);
    return rank(a.code) - rank(b.code) || a.nameDe.localeCompare(b.nameDe, 'de');
  });
  return (
    <div className="filters">
      <div className="filter-caption">
        <SlidersHorizontal size={15} />
        Filters
        <span className="filter-divider" />
      </div>
      <select
        aria-label="Category filter"
        value={s.category}
        onChange={(e) => s.set({ category: e.target.value })}
      >
        <option value="">{t('all')}</option>
        {cats.data?.map((c) => (
          <option key={c.id}>{c.id}</option>
        ))}
      </select>
      <select
        aria-label="Source filter"
        value={s.source}
        onChange={(e) => s.set({ source: e.target.value })}
      >
        <option value="">All sources</option>
        {sources.data?.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Country filter"
        value={s.country}
        onChange={(event) => s.set({ country: event.target.value })}
      >
        <option value="">Alle Länder / All countries</option>
        {countryOptions.map((country) => (
          <option key={country.code} value={country.code}>
            {country.nameDe}
            {country.nameDe !== country.name ? ' / ' + country.name : ''}
            {country.count ? ' (' + country.count + ')' : ''}
          </option>
        ))}
      </select>
      <select
        aria-label="Time filter"
        value={s.hours}
        onChange={(e) => s.set({ hours: Number(e.target.value) })}
      >
        <option value="0">All collected time</option>
        <option value="24">Last 24 hours</option>
        <option value="168">Last 7 days</option>
        <option value="720">Last 30 days</option>
      </select>
      {(s.category || s.source || s.country || s.hours || s.q) && (
        <button
          className="reset-filter"
          onClick={() =>
            s.set({ category: '', source: '', country: '', hours: 0, q: '', asOf: '' })
          }
        >
          Reset <X size={12} />
        </button>
      )}
      <div className="filter-spacer" />
      <div className="mode-switch">
        {!isPortfolio && (
          <button
            className={s.mode === 'live' ? 'active' : ''}
            onClick={() => s.set({ mode: 'live', source: '' })}
          >
            <span className="status-dot" />
            Real data
          </button>
        )}
        <button
          className={s.mode === 'demo' ? 'active' : ''}
          onClick={() => s.set({ mode: 'demo', source: '' })}
        >
          Synthetic demo
        </button>
      </div>
    </div>
  );
}
export function EventCard({ event: e, onClick }: { event: EventRecord; onClick: () => void }) {
  return (
    <button className="event-card" onClick={onClick}>
      <div className="event-top">
        <span className="category-tag" style={{ color: categoryColors[e.category] ?? '#a78bfa' }}>
          <i style={{ background: categoryColors[e.category] ?? '#a78bfa' }} />
          {e.category}
        </span>
        <span className="event-time">
          {new Date(e.occurredAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC',
          })}
        </span>
      </div>
      <h3>{e.title}</h3>
      <div className="event-meta">
        <span>{e.sourceName}</span>
        <span>·</span>
        <span>{e.synthetic ? 'SYNTHETIC' : e.status}</span>
        {!!e.countryCodes?.length && (
          <span className="country-tag">
            {e.countryCodes
              .slice(0, 3)
              .map((code) => countryName(code))
              .join(' · ')}
          </span>
        )}
        <ArrowRight size={12} />
      </div>
    </button>
  );
}
export function Loading() {
  return (
    <div className="skeletons" aria-label="Loading">
      {[1, 2, 3].map((x) => (
        <div key={x} className="skeleton" />
      ))}
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Compass size={30} />
      <h3>No signals here yet</h3>
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({ error }: { error: Error }) {
  return (
    <div className="error-state">
      <WifiOff size={22} />
      <h3>Unable to load records</h3>
      <p>{error.message}</p>
      <span>Check database and source status, then refresh.</span>
    </div>
  );
}
export function ActivityStrip({ events }: { events: EventRecord[] }) {
  const filterParams = useEventParams().toString();
  const activity = useQuery({
    queryKey: ['activity', filterParams],
    queryFn: () => api<{ count: number }[]>('analytics/activity?' + filterParams),
  });
  const counts =
    activity.data?.map((x) => x.count) ??
    Array.from(
      { length: 48 },
      (_, i) =>
        events.filter((e) => {
          const age = (Date.now() - Date.parse(e.occurredAt)) / 3600000;
          return age >= 47 - i && age < 48 - i;
        }).length,
    );
  const max = Math.max(1, ...counts);
  return (
    <section className="activity-strip">
      <div>
        <span className="eyebrow">ACTIVITY TIMELINE</span>
        <h3>
          Last 48 hours <span>UTC</span>
        </h3>
      </div>
      <div className="mini-chart">
        <div className="bars">
          {counts.map((n, i) => (
            <div
              key={i}
              title={`${47 - i} hours ago: ${n} stored records`}
              style={{ height: Math.max(3, (n / max) * 34) }}
            />
          ))}
        </div>
        <div className="chart-axis">
          <span>−48H</span>
          <span>−36H</span>
          <span>−24H</span>
          <span>−12H</span>
          <span>NOW</span>
        </div>
      </div>
      <Link href="/timeline" className="btn btn-sm">
        <Play size={13} />
        Open replay
      </Link>
    </section>
  );
}
export function EventDetail({
  id,
  notify,
  compact = false,
}: {
  id: string;
  notify: (s: string) => void;
  compact?: boolean;
}) {
  const { data, error, isPending } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api('events/' + encodeURIComponent(id)),
  });
  const { set } = useSignal();
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const e = data.event as EventRecord;
  return (
    <article className={`event-detail ${compact ? 'compact' : ''}`}>
      <div className="eyebrow">
        <span className="category-tag" style={{ color: categoryColors[e.category] ?? '#38bdf8' }}>
          {e.category}
        </span>
        <span>{e.synthetic ? 'SYNTHETIC EXERCISE' : 'SOURCE-REPORTED'}</span>
      </div>
      <h1>{e.title}</h1>
      <p className="detail-summary">{e.summary}</p>
      <div className="detail-actions">
        {!isPortfolio && (
          <Button
            size="sm"
            onClick={async () => {
              try {
                await api('saved', { method: 'POST', body: JSON.stringify({ eventId: id }) });
                notify('Event saved to your account.');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <Bookmark size={14} />
            Save event
          </Button>
        )}
        <Button size="sm" asChild>
          <a href={e.sourceUrl} target="_blank" rel="noreferrer">
            {isPortfolio ? 'Synthetic dataset' : 'Original source'} <ExternalLink size={14} />
          </a>
        </Button>
        {compact && (
          <Link
            href={'/events/' + encodeURIComponent(id)}
            className="btn btn-sm"
            onClick={() => set({ selected: null })}
          >
            Full analysis <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="detail-facts">
        <div>
          <span>{e.timeBasis === 'publication' ? 'PUBLISHED' : 'OCCURRED'}</span>
          <strong>{formatTime(e.occurredAt)}</strong>
        </div>
        <div>
          <span>FIRST COLLECTED</span>
          <strong>{formatTime(e.firstDetectedAt)}</strong>
        </div>
        <div>
          <span>GEOGRAPHIC PRECISION</span>
          <strong>{e.precision.replaceAll('_', ' ')}</strong>
        </div>
        <div>
          <span>INDEPENDENT CONFIRMATION</span>
          <strong>Not established</strong>
        </div>
      </div>
      {e.countryBasis?.length ? (
        <section className="country-context">
          <h2>
            <Globe size={17} />
            Country context
          </h2>
          {e.countryBasis.map((ref) => (
            <p key={ref.code}>
              <strong>{countryName(ref.code)}</strong> ·{' '}
              {ref.basis === 'source_section'
                ? 'Publisher’s domestic news section'
                : 'Explicit headline reference'}
            </p>
          ))}
          <p className="muted">Country context does not identify an exact event location.</p>
        </section>
      ) : null}
      {(e.latitude !== null || !!e.countryCodes?.length) && (
        <WorldMap
          events={[e]}
          onSelect={() => {}}
          height={compact ? 190 : 300}
          interactive={false}
        />
      )}
      <section>
        <h2>
          <Shield size={17} />
          Evidence & key facts
        </h2>
        {data.claims.map((c: any) => (
          <div className="claim" key={c.id}>
            <span className="evidence-label">
              {e.synthetic ? 'SYNTHETIC EXERCISE' : 'PROVIDER STATEMENT'}
            </span>
            <p>{c.claim}</p>
            <a href={c.canonical_url} target="_blank" rel="noreferrer">
              View evidence <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </section>
      <section>
        <h2>
          <Clock size={17} />
          Story evolution
        </h2>
        {data.versions.map((v: any) => (
          <div className="version" key={v.id}>
            <span className="timeline-dot" />
            <div>
              <small>{formatTime(v.recorded_at)}</small>
              <p>{v.snapshot.title}</p>
              <span>{v.snapshot.status} · Collected snapshot</span>
            </div>
          </div>
        ))}
      </section>
      <section>
        <h2>
          <Globe size={17} />
          Sources & independence
        </h2>
        {data.sources.map((s: any) => (
          <a
            className="source-evidence"
            href={s.canonical_url}
            key={s.id}
            target="_blank"
            rel="noreferrer"
          >
            <div>
              <strong>{s.name}</strong>
              <p>{s.license}</p>
              <small>Collected {formatTime(s.fetched_at)}</small>
            </div>
            <ExternalLink size={15} />
          </a>
        ))}
        <p className="muted">
          Multiple references from one upstream provider do not establish independent confirmation.
          Automated contradiction analysis is not yet enabled.
        </p>
      </section>
      <section>
        <h2>What remains uncertain</h2>
        <p className="muted">
          This record reflects the source’s metadata. Location, magnitude, timing and status may be
          revised. No additional consequences, impact estimates or causal relationships are
          inferred.
        </p>
      </section>
      {!compact && (
        <section>
          <h2>Related observations</h2>
          <p className="muted">{data.relatedReason}</p>
          <div className="event-grid">
            {data.related.map((r: EventRecord) => (
              <EventCard key={r.id} event={r} onClick={() => location.assign('/events/' + r.id)} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
