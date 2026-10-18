'use client';
import Link from 'next/link';
import { Compass, Shield } from 'lucide-react';
export function PortfolioNotice() {
  return (
    <section className="standard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SIGNAL / PORTFOLIO DEMO</span>
          <h1>Explore the public demo</h1>
          <p>A personal software project by Linhard Zejneli.</p>
        </div>
      </div>
      <div className="panel settings-panel">
        <Shield className="cyan" size={30} />
        <h2>This edition is read-only</h2>
        <p>
          The public portfolio demonstrates the map, country/topic filters, search, historical
          replay, relationship graph and analytics with clearly labeled fictional scenarios.
        </p>
        <p>
          User accounts, private watchlists, saved events, notifications, administration and
          AI-provider access require the full database-backed edition. This public demo creates no
          accounts, sends no emails and stores no private research on a server.
        </p>
        <p>
          Theme and language preferences remain in your browser. No real news articles are published
          by this demo.
        </p>
        <div className="detail-actions">
          <Link className="btn btn-primary" href="/">
            <Compass size={16} />
            Open command center
          </Link>
          <Link className="btn" href="/about">
            About this project
          </Link>
        </div>
      </div>
    </section>
  );
}
