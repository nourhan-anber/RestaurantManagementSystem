'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { removeMenuItem, saveMenuItem, type MenuActionState } from '@/server/actions/menu';

export interface MenuRow {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

const INITIAL: MenuActionState = {};

export function MenuManager({ slug, items }: { slug: string; items: MenuRow[] }) {
  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [state, formAction, pending] = useActionState(saveMenuItem.bind(null, slug), INITIAL);

  // Leave edit mode after each successful save (adjust state during render —
  // new state object per submission, so repeated saves are detected).
  const [handled, setHandled] = useState<MenuActionState>(INITIAL);
  if (state.ok && state !== handled) {
    setHandled(state);
    setEditing(null);
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
            ← Overview
          </Link>
          <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Menu</h1>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_1fr]">
        {/* Editor */}
        <form
          key={editing?.id ?? 'new'}
          action={formAction}
          className="h-fit space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
        >
          <h2 className="font-display text-lg text-foreground">
            {editing ? 'Edit item' : 'Add item'}
          </h2>
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={editing?.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" required defaultValue={editing?.category} placeholder="main-course" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" required defaultValue={editing?.price} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={editing?.description ?? ''}
              className="w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input id="imageUrl" name="imageUrl" type="url" defaultValue={editing?.imageUrl ?? ''} placeholder="https://…" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="isAvailable" defaultChecked={editing ? editing.isAvailable : true} className="size-4 accent-[var(--color-ember)]" />
            Available
          </label>

          {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        {/* List */}
        <div className="space-y-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted">No items yet. Add your first dish.</p>
          ) : (
            categories.map((category) => (
              <div key={category}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{category}</h3>
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
                  {items
                    .filter((i) => i.category === category)
                    .map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-foreground">
                            {item.name}
                            {!item.isAvailable ? (
                              <span className="rounded-full bg-clay/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted">off</span>
                            ) : null}
                          </p>
                          {item.description ? <p className="truncate text-xs text-muted">{item.description}</p> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-sm text-foreground">{formatMoney(item.price)}</span>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(item)}>
                            Edit
                          </Button>
                          <form action={removeMenuItem.bind(null, slug, item.id)}>
                            <Button type="submit" size="sm" variant="ghost" className="text-ember-600">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
