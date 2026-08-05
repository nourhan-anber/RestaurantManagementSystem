import { Button } from '@/components/ui/button';
import { toggleItemAvailability } from '@/server/actions/menu';

interface Item {
  id: number;
  name: string;
  isAvailable: boolean;
}

/** Collapsible "86 an item" panel for the kitchen — one-tap availability toggles. */
export function EightySixPanel({ slug, items }: { slug: string; items: Item[] }) {
  const offCount = items.filter((i) => !i.isAvailable).length;
  return (
    <details className="mb-4 rounded-[var(--radius)] border border-border bg-surface">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-foreground">
        86 an item
        {offCount > 0 ? (
          <span className="rounded-full bg-ember/10 px-2 py-0.5 text-xs text-ember-600">{offCount} off</span>
        ) : null}
      </summary>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto border-t border-border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
            <span className={i.isAvailable ? 'text-foreground' : 'text-muted line-through'}>{i.name}</span>
            <form action={toggleItemAvailability.bind(null, slug, i.id, !i.isAvailable)}>
              <Button type="submit" size="sm" variant="ghost" className={i.isAvailable ? 'text-ember-600' : 'text-pine dark:text-linen'}>
                {i.isAvailable ? '86' : 'Re-enable'}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  );
}
