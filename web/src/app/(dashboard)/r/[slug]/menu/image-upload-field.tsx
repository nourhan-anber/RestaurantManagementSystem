'use client';

import { useState, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';

export function ImageUploadField({
  slug,
  defaultUrl,
  configured,
}: {
  slug: string;
  defaultUrl: string;
  configured: boolean;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/uploads?slug=${encodeURIComponent(slug)}`, { method: 'POST', body });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { url: string };
      setUrl(data.url);
    } catch {
      setError('Upload failed — paste a URL instead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Input name="imageUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      {configured ? (
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFile}
            disabled={busy}
            className="text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-pine file:px-2 file:py-1 file:text-xs file:text-linen"
          />
          {busy ? <span className="text-xs text-muted">Uploading…</span> : null}
        </div>
      ) : (
        <p className="text-[0.7rem] text-muted">Paste an image URL (uploads not configured on this deployment).</p>
      )}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-16 w-16 rounded-[var(--radius)] border border-border object-cover" />
      ) : null}
      {error ? <p className="text-xs text-ember-600">{error}</p> : null}
    </div>
  );
}
