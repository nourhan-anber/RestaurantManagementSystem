'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import {
  removeModifierGroup,
  removeModifierOption,
  saveModifierGroup,
  saveModifierOption,
  type ModifierActionState,
} from '@/server/actions/modifiers';

export interface OptionRow {
  id: number;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}
export interface GroupRow {
  id: number;
  name: string;
  minSelect: number;
  maxSelect: number | null;
  options: OptionRow[];
}

const INITIAL: ModifierActionState = {};

function ruleLabel(g: GroupRow): string {
  const required = g.minSelect >= 1 ? 'required' : 'optional';
  const kind = g.maxSelect === 1 ? 'choose one' : `choose ${g.minSelect}–${g.maxSelect ?? 'any'}`;
  return `${kind} · ${required}`;
}

export function ModifierEditor({
  slug,
  menuItemId,
  groups,
}: {
  slug: string;
  menuItemId: number;
  groups: GroupRow[];
}) {
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [optionTarget, setOptionTarget] = useState<{ groupId: number; option: OptionRow | null } | null>(null);

  const [groupState, groupAction, groupPending] = useActionState(
    saveModifierGroup.bind(null, slug, menuItemId),
    INITIAL,
  );
  const [optionState, optionAction, optionPending] = useActionState(
    saveModifierOption.bind(null, slug),
    INITIAL,
  );

  const [gHandled, setGHandled] = useState<ModifierActionState>(INITIAL);
  if (groupState.ok && groupState !== gHandled) {
    setGHandled(groupState);
    setEditingGroup(null);
  }
  const [oHandled, setOHandled] = useState<ModifierActionState>(INITIAL);
  if (optionState.ok && optionState !== oHandled) {
    setOHandled(optionState);
    setOptionTarget(null);
  }

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 className="font-display text-lg text-foreground">Options</h2>
      <p className="mt-1 text-xs text-muted">Sizes, add-ons, and choices for this item.</p>

      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="rounded-[var(--radius)] border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-[0.7rem] text-muted">{ruleLabel(g)}</p>
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingGroup(g)}>Edit</Button>
                <form action={removeModifierGroup.bind(null, slug, g.id)}>
                  <Button type="submit" size="sm" variant="ghost" className="text-ember-600">✕</Button>
                </form>
              </div>
            </div>

            <ul className="mt-2 space-y-1">
              {g.options.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    {o.name}
                    {!o.isAvailable ? <span className="ml-1 text-[0.6rem] uppercase text-muted">off</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-muted">
                      {o.priceDelta >= 0 ? '+' : '−'}
                      {formatMoney(Math.abs(o.priceDelta))}
                    </span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOptionTarget({ groupId: g.id, option: o })}>Edit</Button>
                    <form action={removeModifierOption.bind(null, slug, o.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-ember-600">✕</Button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>

            {optionTarget && optionTarget.groupId === g.id ? (
              <OptionForm
                key={optionTarget.option?.id ?? 'new'}
                action={optionAction}
                pending={optionPending}
                state={optionState}
                groupId={g.id}
                option={optionTarget.option}
                onCancel={() => setOptionTarget(null)}
              />
            ) : (
              <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setOptionTarget({ groupId: g.id, option: null })}>
                + Add option
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add / edit group */}
      <form key={editingGroup?.id ?? 'new-group'} action={groupAction} className="mt-4 space-y-3 border-t border-border pt-4">
        {editingGroup ? <input type="hidden" name="groupId" value={editingGroup.id} /> : null}
        <div className="space-y-1.5">
          <Label htmlFor="group-name">{editingGroup ? 'Rename group' : 'New option group'}</Label>
          <Input id="group-name" name="name" required defaultValue={editingGroup?.name} placeholder="e.g. Size" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="minSelect">Min</Label>
            <Input id="minSelect" name="minSelect" type="number" min="0" defaultValue={editingGroup?.minSelect ?? 0} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxSelect">Max (blank = any)</Label>
            <Input id="maxSelect" name="maxSelect" type="number" min="1" defaultValue={editingGroup?.maxSelect ?? ''} />
          </div>
        </div>
        {groupState.error ? <p role="alert" className="text-sm text-ember-600">{groupState.error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={groupPending}>{editingGroup ? 'Save group' : 'Add group'}</Button>
          {editingGroup ? <Button type="button" size="sm" variant="ghost" onClick={() => setEditingGroup(null)}>Cancel</Button> : null}
        </div>
      </form>
    </section>
  );
}

function OptionForm({
  action,
  pending,
  state,
  groupId,
  option,
  onCancel,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  state: ModifierActionState;
  groupId: number;
  option: OptionRow | null;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="mt-2 space-y-2 rounded-[var(--radius)] border border-border bg-background p-3">
      {option ? <input type="hidden" name="optionId" value={option.id} /> : <input type="hidden" name="groupId" value={groupId} />}
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Input name="name" required placeholder="Option name" defaultValue={option?.name} />
        <Input name="priceDelta" type="number" step="0.01" placeholder="+$" defaultValue={option?.priceDelta ?? 0} />
      </div>
      <label className="flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" name="isAvailable" defaultChecked={option ? option.isAvailable : true} className="size-3.5 accent-[var(--color-ember)]" />
        Available
      </label>
      {state.error ? <p role="alert" className="text-xs text-ember-600">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{option ? 'Save' : 'Add'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
