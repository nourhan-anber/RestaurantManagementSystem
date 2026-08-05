'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { removeTable, saveTable, type TableActionState } from '@/server/actions/tables';

export interface TableRow {
  id: number;
  number: number;
  capacity: number;
  status: 'OPEN' | 'OCCUPIED' | 'CLOSED';
  isActive: boolean;
  qrUrl: string;
}

const INITIAL: TableActionState = {};

const STATUS_STYLES: Record<TableRow['status'], string> = {
  OPEN: 'bg-pine/10 text-pine dark:bg-linen/10 dark:text-linen',
  OCCUPIED: 'bg-ember/15 text-ember-600',
  CLOSED: 'bg-clay/40 text-muted',
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? 'Copied ✓' : 'Copy QR link'}
    </Button>
  );
}

export function TableManager({ slug, tables }: { slug: string; tables: TableRow[] }) {
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [state, formAction, pending] = useActionState(saveTable.bind(null, slug), INITIAL);

  // Leave edit mode after each successful save (adjust state during render).
  const [handled, setHandled] = useState<TableActionState>(INITIAL);
  if (state.ok && state !== handled) {
    setHandled(state);
    setEditing(null);
  }

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Tables</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[20rem_1fr]">
        <form
          key={editing?.id ?? 'new'}
          action={formAction}
          className="h-fit space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
        >
          <h2 className="font-display text-lg text-foreground">{editing ? `Edit table ${editing.number}` : 'Add table'}</h2>
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="number">Number</Label>
              <Input id="number" name="number" type="number" min="1" required defaultValue={editing?.number} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Seats</Label>
              <Input id="capacity" name="capacity" type="number" min="1" required defaultValue={editing?.capacity ?? 4} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="size-4 accent-[var(--color-ember)]" />
            Active
          </label>

          {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save' : 'Add table'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          {tables.length === 0 ? (
            <p className="text-sm text-muted">No tables yet. Add one to generate its QR link.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
              {tables.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg text-foreground">#{t.number}</span>
                    <span className="text-xs text-muted">{t.capacity} seats</span>
                    <span className={`rounded-full px-2 py-0.5 text-[0.6rem] uppercase tracking-wide ${STATUS_STYLES[t.status]}`}>
                      {t.status.toLowerCase()}
                    </span>
                    {!t.isActive ? (
                      <span className="rounded-full bg-clay/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted">inactive</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyLink url={t.qrUrl} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(t)}>
                      Edit
                    </Button>
                    <form action={removeTable.bind(null, slug, t.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-ember-600">
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
