/**
 * /nearby-shops — the public "Near Shops" page.
 *
 * Route naming: this is deliberately NOT /shops. The singular /shop is already
 * the shop-owner B2B landing page, and /shop vs /shops would be a permanent
 * source of confusion for visitors and maintainers alike.
 *
 * This file is a server component: metadata, static copy and layout only. Every
 * byte of live data is fetched client-side in <NearbyShops />, because
 * next.config.js sets `output: 'export'` in production — there is no server at
 * request time, so no SSR fetching, no route handlers and no server actions.
 */

import { Building2, MapPin, Smartphone } from 'lucide-react';

import { Badge, CTABand, Section, SectionHeading } from '@/components/site/ui';
import { BRAND, CTA, NEARBY } from '@/lib/siteContent';

import NearbyShops from './NearbyShops';

export const metadata = {
  title: 'Near Shops',
  description:
    'Find GGFIX repair shops near you. Share your location to list every shop within 20 km, closest first, with its address and whether it is open right now. Booking happens in the GGFIX app.',
};

/* -------------------------------------------------------------------------- */
/* Static copy                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * What the page can and cannot tell you. This is here to set expectations
 * BEFORE the cards render: the shop API returns only name, address, coordinates
 * and an open flag, so the cards are genuinely sparse. Saying so up front turns
 * "this looks half-built" into "this is all there is, by design".
 */
const WHAT_YOU_GET = [
  {
    icon: MapPin,
    title: 'Distance, measured',
    description:
      'Shops are ranked by real straight-line distance from the coordinates your browser reports — not by who paid for placement.',
  },
  {
    icon: Building2,
    title: 'Name, address, open or closed',
    description:
      'That is what the shop directory holds today. You will not find star ratings or review counts here, because we do not collect them yet.',
  },
  {
    icon: Smartphone,
    title: 'Booking happens in the app',
    description:
      'This page helps you find a shop. Raising a repair, arranging a pickup and tracking the ticket all happen in the GGFIX customer app.',
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function NearbyShopsPage() {
  return (
    <>
      {/* 1 — Heading + the live list -------------------------------------- */}
      <Section tone="soft">
        <SectionHeading as="h1" eyebrow={NEARBY.eyebrow} title={NEARBY.title} />

        <div className="mt-12">
          <NearbyShops />
        </div>
      </Section>

      {/* 2 — What this page does and does not show ------------------------ */}
      <Section tone="white">
        <SectionHeading
          eyebrow="What you are looking at"
          title="Only what we can actually verify"
          subtitle="The shop directory is deliberately thin. Everything on a shop card comes straight from that shop's own record — nothing is estimated, scored or embellished."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-3 sm:gap-6">
          {WHAT_YOU_GET.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-3xl border border-brand-line bg-white p-6 shadow-soft transition hover:border-brand-200 hover:shadow-lift motion-safe:hover:-translate-y-0.5 sm:p-8"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-700">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-brand-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-brand-muted">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 flex max-w-prose flex-wrap items-center justify-center gap-3 text-center text-sm leading-relaxed text-brand-muted">
          <Badge tone="neutral" icon="Lock">
            Private
          </Badge>
          <span className="min-w-0">
            Your coordinates stay in this browser. They are sent to the shop directory only to sort
            the list by distance, and never stored against you.
          </span>
        </p>
      </Section>

      {/* 3 — Closing band: booking happens in the app ---------------------- */}
      <Section tone="page">
        <CTABand
          title="Found a shop? Book it in the GGFIX app."
          subtitle={`This page is the directory — the repair itself starts in the app, where you raise the ticket, choose doorstep pickup or a walk-in, approve the estimate and follow every status change to delivery. The apps are ${BRAND.appsStatus.toLowerCase()}, so tell us where to send yours.`}
          primary={CTA.getApp}
          secondary={CTA.contact}
        />
      </Section>
    </>
  );
}
