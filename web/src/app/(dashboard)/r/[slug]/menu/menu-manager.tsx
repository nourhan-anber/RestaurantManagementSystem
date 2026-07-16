import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { removeMenuItem } from '@/server/actions/menu';
import type { CategoryOption, MenuRow } from './menu-item-form';

export type { CategoryOption, MenuRow } from './menu-item-form';

export function MenuManager({
  slug,
  items,
  categories,
}: {
  slug: string;
  items: MenuRow[];
  categories: CategoryOption[];
}) {
  const hasCategories = categories.length > 0;

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-tight text-foreground">Menu</h1>
        {hasCategories ? (
          <Link href={`/r/${slug}/menu/new`} className={buttonClasses({ size: 'sm' })}>
            Add item
          </Link>
        ) : null}
      </div>

      {!hasCategories ? (
        <p className="mt-6 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm text-muted">
          Add a category first (panel on the left) before creating items.
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
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
                            {item.modifierGroups.length > 0 ? (
                              <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-pine dark:bg-linen/10 dark:text-linen">
                                {item.modifierGroups.length} option{item.modifierGroups.length > 1 ? 's' : ''}
                              </span>
                            ) : null}
                          </p>
                          {item.description ? <p className="truncate text-xs text-muted">{item.description}</p> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-sm text-foreground">{formatMoney(item.price)}</span>
                          <Link href={`/r/${slug}/menu/${item.id}`} className={buttonClasses({ size: 'sm', variant: 'ghost' })}>
                            Edit
                          </Link>
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
  );
}
