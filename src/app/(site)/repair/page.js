import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight, Navigation, Receipt } from 'lucide-react';

import HeroCarousel from '@/components/site/HeroCarousel';
import RepairBreadcrumb from '@/components/site/RepairBreadcrumb';
import RepairExtras from '@/components/site/RepairExtras';
import RepairFlow from '@/components/site/RepairFlow';
import StoreBadges from '@/components/site/StoreBadges';
import {
  Badge,
  Button,
  Card,
  Section,
  SectionHeading,
  StepList,
  cx,
} from '@/components/site/ui';
import { REPAIR_STEPS, TICKET_LIFECYCLE } from '@/lib/siteContent';

export const metadata = {
  title: 'Repair your device',
  description:
    'Pick your device category, choose what needs fixing, and book a doorstep pickup or an in-shop repair with a verified GGFIX shop near you — then track every stage live.',
};

export default function RepairPage() {
  /* The marketing chrome that surrounds the picker. Defined as consts so each can
     be passed to <RepairExtras> AND to its Suspense fallback — identical content
     in both means the bare /repair page keeps them in the static HTML with no
     flash, while /repair?category=… hides them (see RepairExtras). */
  const heroBanner = (
    <Section tone="white" padding="hairline">
      <HeroCarousel title="Repair" className="mx-auto w-full max-w-[1028px]" />
    </Section>
  );

  const detailSections = (
    <>
      {/* How a repair works — same REPAIR_STEPS / TICKET_LIFECYCLE as the home
          page's #repair section, so the two can never drift in wording. */}
      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Our Repair"
              title="From cracked screen to delivered, in seven steps"
              subtitle="Pick the device, pick the fault, review the report — then choose a doorstep pickup or walk it in. Either way you watch the whole thing happen."
              align="left"
            />
            <StepList steps={REPAIR_STEPS} className="mt-10" />
          </div>

          <div className="lg:pt-4">
            <Card hover={false} className="lg:sticky lg:top-28">
              <Badge tone="brand" icon={Navigation}>
                Live tracking
              </Badge>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-brand-ink">
                The six stages you will see
              </h2>
              <p className="mt-2 text-base leading-relaxed text-brand-muted">
                This is the same ticket lifecycle the shop works to. When their technician moves the
                job, your app moves with it.
              </p>

              <ol className="mt-6 space-y-4">
                {TICKET_LIFECYCLE.map((stage, index) => (
                  <li key={stage.status} className="flex gap-3">
                    <span
                      className={cx(
                        'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        index === TICKET_LIFECYCLE.length - 1
                          ? 'bg-accent-500 text-white'
                          : 'bg-brand-soft text-brand-700',
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-ink">{stage.status}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-brand-muted">
                        {stage.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex items-start gap-2 rounded-2xl bg-brand-soften p-4">
                <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-brand-muted">
                  A service receipt and a digital invoice land in the app when the job is delivered.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </Section>

      {/* Closing CTA — custom two-column band (message + store badges) rather than
          the shared <CTABand>, which is left untouched for other pages. */}
      <Section tone="white" padding="tight">
        <div className="overflow-hidden rounded-4xl bg-brand-700 shadow-lift">
          <div className="grid items-center gap-8 px-6 py-12 sm:px-12 sm:py-14 lg:grid-cols-2 lg:gap-12">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get it fixed?
              </h2>
              <p className="mx-auto mt-4 max-w-prose text-base leading-relaxed text-brand-100 sm:text-lg lg:mx-0">
                Book the repair in the GGFIX app — pick your device, choose the fault, and a verified
                shop near you takes it from there.
              </p>
              <div className="mt-7 flex justify-center lg:justify-start">
                <Button href="/nearby-shops" variant="white" size="lg" icon="ArrowRight">
                  Find a shop near you
                </Button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm rounded-3xl bg-white/10 p-6 text-center ring-1 ring-white/15">
                <p className="text-lg font-bold text-white">Get the GGFIX app</p>
                <StoreBadges className="mt-4" />
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* 1. Breadcrumb                                                     */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="white" padding="snug">
        {/* The visible title, subtitle, CTAs and assurance chips were removed —
            this breadcrumb is all that remains above the banner.

            The <h1> stays, visually hidden. A page still needs exactly one for
            search engines and for screen-reader document navigation, and a
            breadcrumb cannot supply it: "Repair" there is a location marker, not
            the page's heading. Delete this only if a visible <h1> comes back. */}
        <h1 className="sr-only">Repair</h1>

        {/* One trail for the whole flow: Home › Repair, growing to
            Home › Repair › Categories › Mobile › … as the picker advances.
            It reads the URL, so it sits in Suspense (fallback = the bare trail,
            which is also the static-export HTML). RepairFlow no longer renders
            its own breadcrumb — this is the single source. */}
        <Suspense
          fallback={
            <nav aria-label="Breadcrumb">
              <ol className="flex list-none flex-wrap items-center gap-1.5 p-0 text-sm text-brand-muted">
                <li>
                  <Link
                    href="/"
                    className="rounded font-medium transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-brand-subtle">
                  <ChevronRight className="h-4 w-4" />
                </li>
                <li aria-current="page" className="font-semibold text-brand-ink">
                  Repair
                </li>
              </ol>
            </nav>
          }
        >
          <RepairBreadcrumb />
        </Suspense>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Hero banner — category step only                              */}
      {/* ---------------------------------------------------------------- */}
      {/* Hidden once a category is chosen (see RepairExtras). The banner is 1028x366
          (its authored size), capped so object-cover never trims the artwork. */}
      <Suspense fallback={heroBanner}>
        <RepairExtras>{heroBanner}</RepairExtras>
      </Suspense>

      {/* ---------------------------------------------------------------- */}
      {/* 3. Pick a device — the Category → Brand → Product wizard         */}
      {/* ---------------------------------------------------------------- */}
      {/* RepairFlow is a client component that drives the whole picker from
          the URL query (?category=…&brand=…&model=…), so the Back button and
          shareable links work. It replaces the old presentational tiles: the
          category tiles now advance to Select Brand → Select Product, mirroring
          the customer app, and end on a "book in the app / find a shop" summary.
          Wrapped in Suspense because it reads useSearchParams(), which the
          static export requires to sit inside a Suspense boundary. */}
      {/* padding="snug", not "tight": with the hero hidden on a category step,
          the picker sits right under the breadcrumb, and "tight" left a large
          empty band above the "Select a brand" panel. On the bare /repair page
          this just pulls the category grid a little closer to the banner. */}
      <Section tone="white" padding="snug">
        {/* No panel background or border — the picker sits directly on the white
            page. Padding kept so the grid does not run to the page gutters. */}
        <div className="py-2">
          <Suspense
            fallback={
              <h2 className="text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
                Select your device category to repair
              </h2>
            }
          >
            <RepairFlow />
          </Suspense>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. How a repair works + closing CTA — category step only        */}
      {/* ---------------------------------------------------------------- */}
      <Suspense fallback={detailSections}>
        <RepairExtras>{detailSections}</RepairExtras>
      </Suspense>
    </>
  );
}
