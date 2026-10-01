import { notFound } from 'next/navigation';

import ComingSoon from '@/components/shop-dashboard/ComingSoon';
import { ALL_STUB_SLUGS, findNavItemBySlug } from '@/lib/partnerNav';

/** Required under output:'export' — every stub destination is pre-rendered. */
export function generateStaticParams() {
  return ALL_STUB_SLUGS.map((slug) => ({ slug: slug.split('/') }));
}

/**
 * Catch-all for every sidebar destination under /shop-home/* that doesn't
 * have a real page yet — see src/lib/partnerNav.js's doc comment. A path
 * matching a real nav item renders an honest ComingSoon; anything else
 * (typos, stale links) falls through to the real not-found page rather than
 * pretending every arbitrary URL is valid.
 *
 * When a real page is later added at one of these paths (e.g.
 * src/app/shop-home/services/bookings/page.js), Next.js routes to it
 * directly and this catch-all is never consulted for that path again.
 */
export default function PartnerNavStubPage({ params }) {
  const item = findNavItemBySlug(params.slug);
  if (!item) notFound();

  return <ComingSoon icon={item.icon} title={item.label} description={item.description} />;
}
