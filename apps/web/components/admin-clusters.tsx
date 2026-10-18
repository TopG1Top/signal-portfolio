'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import { Button } from './ui/button';
export function AdminClusters({ notify }: { notify: (s: string) => void }) {
  const [sourceId, setSource] = useState(''),
    [targetId, setTarget] = useState(''),
    [action, setAction] = useState<'merge' | 'split'>('merge'),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  return (
    <form
      className="panel settings-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api('admin/clusters', {
            method: 'POST',
            body: JSON.stringify({ sourceId, targetId, action, reason }),
          });
          void qc.invalidateQueries();
          notify('Cluster correction saved with audit history.');
        } catch (e) {
          notify((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Review and correct a cluster</h2>
      <p>
        Compare both source records before merging. Source records and historical snapshots remain
        available. Splitting restores the original record to the feed.
      </p>
      <div className="two-column">
        <label>
          Source event ID
          <input required value={sourceId} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label>
          Target event ID
          <input required value={targetId} onChange={(e) => setTarget(e.target.value)} />
        </label>
      </div>
      <label>
        Correction
        <select value={action} onChange={(e) => setAction(e.target.value as 'merge' | 'split')}>
          <option value="merge">Merge source into target</option>
          <option value="split">Split source back out of target</option>
        </select>
      </label>
      <label>
        Evidence and reason
        <input
          required
          minLength={10}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain the supporting evidence and source links"
        />
      </label>
      <Button disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Apply correction'}
      </Button>
    </form>
  );
}
