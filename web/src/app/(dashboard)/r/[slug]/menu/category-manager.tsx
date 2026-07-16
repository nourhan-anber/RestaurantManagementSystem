'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  moveCategoryAction,
  removeCategory,
  saveCategory,
  type MenuActionState,
} from '@/server/actions/menu';
import type { CategoryOption } from './menu-manager';

const INITIAL: MenuActionState = {};

export function CategoryManager({ slug, categories }: { slug: string; categories: CategoryOption[] }) {
  const [editing, setEditing] = useState<CategoryOption | null>(null);
  const [saveState, saveAction, savePending] = useActionState(saveCategory.bind(null, slug), INITIAL);
  const [delState, delAction] = useActionState(removeCategory.bind(null, slug), INITIAL);

  const [handled, setHandled] = useState<MenuActionState>(INITIAL);
  if (saveState.ok && saveState !== handled) {
    setHandled(saveState);
    setEditing(null);
  }

  return (
    <section className="h-fit rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 className="font-display text-lg text-foreground">Categories</h2>

      <ul className="mt-3 divide-y divide-border">
        {categories.length === 0 ? (
          <li className="py-2 text-sm text-muted">None yet — add one below.</li>
        ) : (
          categories.map((c, idx) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm text-foreground">
                {c.name}
                {c.isHidden ? <span className="ml-2 text-xs text-muted">hidden</span> : null}
              </span>
              <div className="flex items-center gap-1">
                <form action={moveCategoryAction.bind(null, slug, c.id, 'up')}>
                  <Button type="submit" size="sm" variant="ghost" disabled={idx === 0}>↑</Button>
                </form>
                <form action={moveCategoryAction.bind(null, slug, c.id, 'down')}>
                  <Button type="submit" size="sm" variant="ghost" disabled={idx === categories.length - 1}>↓</Button>
                </form>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                <form action={delAction}>
                  <input type="hidden" name="categoryId" value={c.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-ember-600">✕</Button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>

      {delState.error ? <p role="alert" className="mt-2 text-sm text-ember-600">{delState.error}</p> : null}

      <form key={editing?.id ?? 'new'} action={saveAction} className="mt-4 space-y-3 border-t border-border pt-4">
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">{editing ? 'Rename category' : 'New category'}</Label>
          <Input id="cat-name" name="name" required defaultValue={editing?.name} placeholder="e.g. Mains" />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="isHidden" defaultChecked={editing?.isHidden ?? false} className="size-4 accent-[var(--color-ember)]" />
          Hidden from customers
        </label>
        {saveState.error ? <p role="alert" className="text-sm text-ember-600">{saveState.error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={savePending}>{editing ? 'Save' : 'Add category'}</Button>
          {editing ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
