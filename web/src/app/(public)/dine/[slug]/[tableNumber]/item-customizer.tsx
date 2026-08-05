'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import type { CartSelectedOption } from '@/lib/cart';
import type { CustomerGroup, CustomerMenuItem } from './customer-menu';

function initialSelection(groups: CustomerGroup[]): Record<number, number[]> {
  const init: Record<number, number[]> = {};
  for (const g of groups) {
    // Preselect the first option of a required single-select so it's ready to add.
    init[g.id] = g.minSelect >= 1 && g.maxSelect === 1 && g.options[0] ? [g.options[0].id] : [];
  }
  return init;
}

export function ItemCustomizer({
  item,
  onClose,
  onAdd,
}: {
  item: CustomerMenuItem;
  onClose: () => void;
  onAdd: (options: CartSelectedOption[], notes: string) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number[]>>(() => initialSelection(item.groups));
  const [notes, setNotes] = useState('');

  function toggle(group: CustomerGroup, optionId: number) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.maxSelect === 1) return { ...prev, [group.id]: [optionId] };
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((x) => x !== optionId) };
      }
      if (group.maxSelect != null && current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  const chosen: CartSelectedOption[] = item.groups.flatMap((g) =>
    (selected[g.id] ?? []).flatMap((oid) => {
      const o = g.options.find((x) => x.id === oid);
      return o ? [{ optionId: o.id, groupId: g.id, name: o.name, priceDelta: o.priceDelta }] : [];
    }),
  );
  const unitPrice = item.price + chosen.reduce((s, o) => s + o.priceDelta, 0);
  const satisfied = item.groups.every((g) => {
    const count = (selected[g.id] ?? []).length;
    return count >= g.minSelect && (g.maxSelect == null || count <= g.maxSelect);
  });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">{item.name}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        {item.description ? <p className="mt-1 text-sm text-muted">{item.description}</p> : null}

        <div className="mt-4 space-y-5">
          {item.groups.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-medium text-foreground">
                {g.name}
                <span className="ml-1 text-xs text-muted">
                  {g.minSelect >= 1 ? 'required' : 'optional'}
                  {g.maxSelect === 1 ? '' : ` · up to ${g.maxSelect ?? 'any'}`}
                </span>
              </p>
              <div className="mt-1.5 space-y-1">
                {g.options.map((o) => {
                  const checked = (selected[g.id] ?? []).includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2 text-sm text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                          name={`group-${g.id}`}
                          checked={checked}
                          onChange={() => toggle(g, o.id)}
                          className="accent-[var(--color-ember)]"
                        />
                        {o.name}
                      </span>
                      {o.priceDelta !== 0 ? (
                        <span className="tabular-nums text-muted">+{formatMoney(o.priceDelta)}</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-sm font-medium text-foreground">Special instructions</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. no onions, sauce on the side"
              className="mt-1.5 w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
            />
          </div>
        </div>

        <Button className="mt-5 w-full" size="lg" disabled={!satisfied} onClick={() => onAdd(chosen, notes)}>
          Add · {formatMoney(unitPrice)}
        </Button>
      </div>
    </div>
  );
}
