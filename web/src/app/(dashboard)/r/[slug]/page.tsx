import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { findMembership } from '@/server/authz';
import { RESTAURANT_SECTIONS, sectionHref, visibleSections } from '@/lib/nav';
import { SectionCard } from '@/components/dashboard/section-card';

// Sections whose routes exist. Grows as later phases land (menu/tables → P5,
// kitchen/floor → P6, staff → P5, reports → P9, settings/billing → P8).
const BUILT_SECTIONS = new Set<string>([
  'menu',
  'tables',
  'staff',
  'kitchen',
  'floor',
  'settings',
]);

export default async function TenantOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership) notFound();

  const sections = visibleSections(membership.role);
  const hiddenCount = RESTAURANT_SECTIONS.length - sections.length;

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight text-foreground">Overview</h1>
      <p className="mt-1 text-sm text-muted">
        You have <span className="font-medium text-foreground">{membership.role.toLowerCase()}</span>{' '}
        access — here&rsquo;s what you can manage.
        {hiddenCount > 0 ? ` ${hiddenCount} more section${hiddenCount > 1 ? 's are' : ' is'} limited to other roles.` : ''}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const built = BUILT_SECTIONS.has(section.key);
          return (
            <SectionCard
              key={section.key}
              label={section.label}
              description={section.description}
              href={built ? sectionHref(slug, section) : undefined}
              comingSoon={!built}
            />
          );
        })}
      </div>
    </div>
  );
}
