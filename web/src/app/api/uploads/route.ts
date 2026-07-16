import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { getStorageProvider, isUploadConfigured } from '@/server/storage';
import { extensionForType, validateUpload } from '@/lib/upload';

// Authenticated menu-image upload for a restaurant's owner/manager.
export async function POST(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'menu:write')) {
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
  const { url } = await provider.upload({ bytes, contentType: file.type, filename });
  return NextResponse.json({ url });
}
