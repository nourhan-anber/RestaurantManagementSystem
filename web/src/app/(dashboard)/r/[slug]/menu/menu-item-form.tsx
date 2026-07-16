'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DIETARY_LABELS, DIETARY_TAGS, MAX_SPICE } from '@/lib/dietary';
import { saveMenuItem, type MenuActionState } from '@/server/actions/menu';
import type { DietaryTag } from '@/generated/prisma/enums';
import type { GroupRow } from './modifier-editor';
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

export function MenuItemForm({
  slug,
  item,
  categories,
  uploadConfigured,
}: {
  slug: string;
  item: MenuRow | null;
  categories: CategoryOption[];
  uploadConfigured: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveMenuItem.bind(null, slug), INITIAL);

  // On a successful save, return to the menu list (data is revalidated there).
  useEffect(() => {
    if (state.ok) router.push(`/r/${slug}/menu`);
  }, [state, router, slug]);

  const hasCategories = categories.length > 0;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-6"
    >
      <div>
        <h2 className="font-display text-lg text-foreground">Details</h2>
        <p className="mt-1 text-xs text-muted">Name, price, photo, and dietary info.</p>
      </div>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      {!hasCategories ? (
        <p className="rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-xs text-muted">
          Add a category first (on the menu page) before creating items.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={item?.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={item?.categoryId ?? categories[0]?.id ?? ''}
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
          <Input id="price" name="price" type="number" step="0.01" min="0" required defaultValue={item?.price} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={item?.description ?? ''}
          className="w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Photo</Label>
        <ImageUploadField slug={slug} defaultUrl={item?.imageUrl ?? ''} configured={uploadConfigured} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="spiceLevel">Spice level</Label>
        <select id="spiceLevel" name="spiceLevel" defaultValue={item?.spiceLevel ?? 0} className={selectClass}>
          {['None', 'Mild', 'Medium', 'Hot'].slice(0, MAX_SPICE + 1).map((label, level) => (
            <option key={label} value={level}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-foreground">Dietary</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {DIETARY_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                name="dietaryTags"
                value={tag}
                defaultChecked={item?.dietaryTags.includes(tag) ?? false}
                className="size-3.5 accent-[var(--color-ember)]"
              />
              {DIETARY_LABELS[tag]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="isAvailable" defaultChecked={item ? item.isAvailable : true} className="size-4 accent-[var(--color-ember)]" />
        Available
      </label>

      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending || !hasCategories}>
          {pending ? 'Saving…' : item ? 'Save changes' : 'Add item'}
        </Button>
        <Link href={`/r/${slug}/menu`} className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
