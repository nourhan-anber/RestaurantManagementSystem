'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { DIETARY_LABELS, DIETARY_TAGS, MAX_SPICE } from '@/lib/dietary';
import { removeMenuItem, saveMenuItem, type MenuActionState } from '@/server/actions/menu';
import type { DietaryTag } from '@/generated/prisma/enums';
import { ModifierEditor, type GroupRow } from './modifier-editor';
import { ImageUploadField } from './image-upload-field';

export interface MenuRow {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  dietaryTags: DietaryTag[];
  spiceLevel: number;
  modifierGroups: GroupRow[];
}

export interface CategoryOption {
  id: number;
  name: string;
  position: number;
  isHidden: boolean;
}

const INITIAL: MenuActionState = {};

const selectClass =
  'h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30';

export function MenuManager({
  slug,
  items,
  categories,
  uploadConfigured,
}: {
  slug: string;
  items: MenuRow[];
  categories: CategoryOption[];
  uploadConfigured: boolean;
}) {
  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [state, formAction, pending] = useActionState(saveMenuItem.bind(null, slug), INITIAL);

  const [handled, setHandled] = useState<MenuActionState>(INITIAL);
  if (state.ok && state !== handled) {
    setHandled(state);
    setEditing(null);
  }

  const hasCategories = categories.length > 0;

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Menu</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_1fr]">
        {/* Editor + modifiers */}
        <div className="space-y-6">
        <form
          key={editing?.id ?? 'new'}
          action={formAction}
          className="h-fit space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
        >
          <h2 className="font-display text-lg text-foreground">{editing ? 'Edit item' : 'Add item'}</h2>
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          {!hasCategories ? (
            <p className="rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-xs text-muted">
              Add a category first (panel on the right) before creating items.
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={editing?.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={editing?.categoryId ?? categories[0]?.id ?? ''}
                className={selectClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
            <Label>Photo</Label>
            <ImageUploadField slug={slug} defaultUrl={editing?.imageUrl ?? ''} configured={uploadConfigured} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spiceLevel">Spice level</Label>
            <select id="spiceLevel" name="spiceLevel" defaultValue={editing?.spiceLevel ?? 0} className={selectClass}>
              {['None', 'Mild', 'Medium', 'Hot'].slice(0, MAX_SPICE + 1).map((label, level) => (
                <option key={label} value={level}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-foreground">Dietary</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {DIETARY_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    name="dietaryTags"
                    value={tag}
                    defaultChecked={editing?.dietaryTags.includes(tag) ?? false}
                    className="size-3.5 accent-[var(--color-ember)]"
                  />
                  {DIETARY_LABELS[tag]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="isAvailable" defaultChecked={editing ? editing.isAvailable : true} className="size-4 accent-[var(--color-ember)]" />
            Available
          </label>

          {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !hasCategories}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

          {editing ? (
            <ModifierEditor slug={slug} menuItemId={editing.id} groups={editing.modifierGroups} />
          ) : (
            <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-3 text-xs text-muted">
              Save an item, then edit it to add options (sizes, add-ons…).
            </p>
          )}
        </div>

        {/* List grouped by category (ordered by category position) */}
        <div className="space-y-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted">No items yet. Add your first dish.</p>
          ) : (
            categories
              .filter((c) => items.some((i) => i.categoryId === c.id))
              .map((category) => (
                <div key={category.id}>
                  <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
                    {category.name}
                    {category.isHidden ? <span className="text-[0.6rem] normal-case">(hidden)</span> : null}
                  </h3>
                  <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
                    {items
                      .filter((i) => i.categoryId === category.id)
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
