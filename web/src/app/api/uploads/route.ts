import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { getStorageProvider, isUploadConfigured } from '@/server/storage';
import { extensionForType, validateUpload } from '@/lib/upload';

// Authenticated image upload. `kind=menu` (menu:write, menu/ prefix) is the
// default; `kind=branding` (settings:write, branding/ prefix) is for the logo.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') ?? '';
  const kind = url.searchParams.get('kind') === 'branding' ? 'branding' : 'menu';
  const ability = kind === 'branding' ? 'settings:write' : 'menu:write';

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, ability)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!isUploadConfigured()) {
    return NextResponse.json({ error: 'uploads not configured' }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }

  const check = validateUpload(file.type, file.size);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const provider = getStorageProvider();
  if (!provider) return NextResponse.json({ error: 'uploads not configured' }, { status: 503 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${extensionForType(file.type)}`;
  const uploaded = await provider.upload({ bytes, contentType: file.type, filename, keyPrefix: kind });
  return NextResponse.json({ url: uploaded.url });
}
