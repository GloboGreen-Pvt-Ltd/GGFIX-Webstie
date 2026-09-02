import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Handshake,
  ListChecks,
  LockKeyhole,
  Navigation,
  Package,
  Receipt,
  ScanFace,
  ShieldCheck,
  Store,
} from 'lucide-react';

import HeroCarousel from '@/components/site/HeroCarousel';
import {
  Badge,
  Button,
  Card,
  CTABand,
  FeatureCard,
  Section,
  SectionHeading,
  StatTile,
  StepList,
  cx,
} from '@/components/site/ui';
import {
  BRAND,
  BUY_FEATURES,
  CTA,
  CUSTOMER_EXTRAS,
  FAQS,
  HOME_MENU_GROUPS,
  REPAIR_STEPS,
  SELL_HIGHLIGHT,
  SELL_STEPS,
  TICKET_LIFECYCLE,
} from '@/lib/siteContent';

export const metadata = {
  title: 'Repair, Buy & Sell your phone',
  description:
    'Book a phone repair with doorstep pickup, track every stage live, and sell your old handset to the highest-quoting shop near you. GGFIX connects you to verified repair shops within 20 km.',
};

/* -------------------------------------------------------------------------- */
/* Local, page-only pieces                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Scroll offset for every in-page anchor target on this page.
 *
 * Repair / Sell / Buy in the primary nav are hash links to sections on THIS
 * page, and the header is sticky. Without a scroll margin the browser puts the
 * section's top edge at y=0 — directly underneath the header — so the eyebrow
 * and part of the heading land behind it.
 *
 * Sized against the real header, not guessed:
 *   < sm   h-16                      = 64px
 *   sm     h-20                      = 80px
 *   lg     h-20 + the menu row       = 133px  (80 + 1px border + 16px ul
 *                                              padding + 36px link box)
 * 6rem/9rem clears each with room to spare. Matches the scroll-mt-28 already
 * used by the /terms and /privacy clause anchors.
 */
const ANCHOR_OFFSET = 'scroll-mt-24 lg:scroll-mt-36';

/**
 * Artwork per "Our Services" card, keyed by HOME_MENU_GROUPS[].key.
 *
 * These are real files in public/ (1254x1254 each), not remote URLs — so unlike
 * the banner and category images they are guaranteed present at build time and
 * need no loading or failure state. Plain <img> rather than next/image: the
 * config sets images.unoptimized, so next/image would emit the same tag while
 * adding nothing.
 */
const SERVICE_IMAGES = {
  repair: '/repair.png',
  sell: '/sell.png',
  buy: '/buy.png',
};

/** My Orders really splits into these five groups. */
const ORDER_TABS = ['Buy', 'Sell', 'Pickup', 'Enquiry', 'Service'];

/**
 * Facts for the customer reading this page.
 *
 * Deliberately NOT the shared PLATFORM_FACTS: two of those four tiles are about
 * the shop-owner subscription and the backend architecture, which on a customer
 * page reads as though the customer's own use is a 15-day trial. It is not —
 * the app is free for customers. Every figure below is checkable inside the
 * customer app or on /pricing.
 */
const CUSTOMER_FACTS = [
  { value: '20', unit: 'km', label: 'Radius for finding repair shops near you' },
  { value: '6', unit: 'stages', label: 'On every repair ticket, from accepted to delivered' },
  { value: '5', unit: 'order types', label: 'Buy, Sell, Pickup, Enquiry and Service in My Orders' },
  { value: '₹0', label: 'What the GGFIX app costs you as a customer' },
];
const ORDER_STATUSES = ['Pending', 'Completed', 'Cancelled'];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const faqTeaser = FAQS.slice(0, 5);

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero                                                          */}
      {/* ---------------------------------------------------------------- */}
      {/* padding="hairline" (2px): the hero is a single image sitting straight
          under the sticky header, whose bottom border already separates the two.
          Anything more than a couple of px reads as a gap, not breathing room. */}
      <Section
        tone="white"
        padding="hairline"
        className="relative overflow-hidden"
        containerClassName="relative"
      >
        {/* decorative gradient blobs */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-40 h-72 w-72 rounded-full bg-brand-100 opacity-70 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-accent-100 opacity-60 blur-3xl"
        />

        {/* The hero is now purely the banner slider — the headline, CTAs and
            feature list were removed. A page still needs exactly one <h1> for
            search engines and for screen-reader document navigation, and a
            banner image cannot supply one, so it lives here visually hidden.
            Remove this only if a visible <h1> comes back to the hero. */}
        <h1 className="sr-only">
          {BRAND.name} — {BRAND.tagline}
        </h1>

        {/* Admin-managed banner slider. Slides come from /master/banners, so
            adding one in the admin changes the hero with no code change. */}
        {/* Full container width. Banners are authored at 1920x700, so at the
            1280px container this renders ~467px tall — full-bleed within the
            page gutters without the ~640px slab the old 2:1 art produced. */}
        <HeroCarousel exclude={['Repair']} className="relative mx-auto w-full max-w-[1028px]" />
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. The category menu                                             */}
      {/* ---------------------------------------------------------------- */}
      {/* "Our Services" is the section's own <h2>. The card labels beneath it
          are plain <span>s, not headings — three words in a row do not warrant
          heading semantics and would only pad the document outline. */}
      {/* padding="tight" as well: the hero above is tight, so the default
          py-16/20/24 here stacked a large empty band between the banner and
          "Our Services". Both tight puts them a comfortable distance apart
          without the gap reading as a missing section. */}
      <Section id="menu" tone="page" padding="tight" className={ANCHOR_OFFSET}>
        {/* Three cards, one per journey — icon and name only. The per-category
            device tiles that used to fill this section are gone; each card is a
            single link into its detail section further down the page. */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
            Our Services
          </h2>

          <ul role="list" className="mt-6 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-3">
            {HOME_MENU_GROUPS.map((group) => (
              <li key={group.key}>
                <Link
                  href={group.href}
                  className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-brand-line bg-white p-4 text-center shadow-soft transition hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 sm:p-5"
                >
                  {/* Decorative: the card's own label sits directly beneath and
                      the link already has an accessible name from it, so a
                      descriptive alt here would just be announced twice. */}
                  <img
                    src={SERVICE_IMAGES[group.key]}
                    alt=""
                    width={1254}
                    height={1254}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-16 object-contain transition motion-safe:group-hover:scale-105 sm:h-20 sm:w-20"
                  />
                  <span className="text-base font-bold tracking-tight text-brand-ink sm:text-lg">
                    {group.action}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. How a repair works                                            */}
      {/* ---------------------------------------------------------------- */}
      <Section id="repair" tone="white" className={ANCHOR_OFFSET}>
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
              <h3 className="mt-4 text-xl font-bold tracking-tight text-brand-ink">
                The six stages you will see
              </h3>
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
                          : 'bg-brand-soft text-brand-700'
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

      {/* ---------------------------------------------------------------- */}
      {/* 4. Sell — the differentiator                                     */}
      {/* ---------------------------------------------------------------- */}
      <Section id="sell" tone="dark" className={ANCHOR_OFFSET}>
        <SectionHeading
          eyebrow="Our Sell"
          title={SELL_HIGHLIGHT.title}
          subtitle={SELL_HIGHLIGHT.description}
          inverted
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Package,
              title: 'You describe it once',
              body: 'Ten guided steps capture condition, screen, faults, configuration, accessories, warranty and photos.',
            },
            {
              icon: Store,
              title: 'Nearby shops quote',
              body: 'That single submission goes out to shops around you, and several of them can come back with a price.',
            },
            {
              icon: Handshake,
              title: 'You accept the best',
              body: 'Compare the quotations side by side in the app and accept whichever offer you actually like.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-100">
                <item.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-white">{item.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-brand-100">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            The ten steps of a sell listing
          </h3>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SELL_STEPS.map((step, index) => (
              <li
                key={step.title}
                className={cx(
                  'flex gap-3 rounded-2xl border p-4',
                  step.highlight
                    ? 'border-accent-400/60 bg-accent-500/15 sm:col-span-2 lg:col-span-1'
                    : 'border-white/10 bg-white/5'
                )}
              >
                <span
                  className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    step.highlight ? 'bg-accent-500 text-white' : 'bg-white/10 text-brand-100'
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={cx(
                      'text-sm font-bold',
                      step.highlight ? 'text-accent-100' : 'text-white'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-brand-100">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12">
          <Button href={CTA.getApp.href} variant="white" size="lg" icon="ArrowRight">
            {CTA.getApp.label}
          </Button>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 5. Buy — refurbished devices and accessories                      */}
      {/* ---------------------------------------------------------------- */}
      <Section id="buy" tone="white" className={ANCHOR_OFFSET}>
        <SectionHeading
          eyebrow="Our Buy"
          title="Buy from the shops that already fix the phones"
          subtitle="The Buy tab lists refurbished handsets, accessories and spare parts put up by the same verified shops you book repairs with. Browse by category, open the full listing, add it to your cart."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BUY_FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-700">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-bold tracking-tight text-brand-ink">
              Listed by a shop, not a stranger
            </h3>
            <p className="mt-2 text-base leading-relaxed text-brand-muted">
              Everything on the Buy tab comes from a registered GGFIX repair shop with a real address
              near you — the same shops that handle repairs and pickups. If something needs looking
              at afterwards, you already know where it came from.
            </p>
          </Card>

          <Card>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-600">
              <Package className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-bold tracking-tight text-brand-ink">
              Cart today, order history tomorrow
            </h3>
            <p className="mt-2 text-base leading-relaxed text-brand-muted">
              Add items to a normal cart and place the order in the app. Every purchase lands in the
              Buy tab of My Orders alongside your repairs and sell listings, so one screen holds
              everything you have done with GGFIX.
            </p>
          </Card>
        </div>

      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. Why GGFIX                                                     */}
      {/* ---------------------------------------------------------------- */}
      <Section id="why" tone="page" className={ANCHOR_OFFSET}>
        <SectionHeading
          eyebrow="Why GGFIX"
          title="Handing over your phone should not feel like a leap of faith"
          subtitle="Every one of these is a feature that already ships in the app — not a promise about a roadmap."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CUSTOMER_EXTRAS.map((item) => (
            <FeatureCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-700">
              <LockKeyhole className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-bold tracking-tight text-brand-ink">
              Your unlock PIN, handled properly
            </h3>
            <p className="mt-2 text-base leading-relaxed text-brand-muted">
              A technician usually needs to get into the device to test it. GGFIX captures the PIN or
              pattern and the list of missing parts as a formal step of intake, recorded against the
              booking — instead of on a sticky note taped to the back of your phone.
            </p>
          </Card>

          <Card>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-600">
              <ScanFace className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-bold tracking-tight text-brand-ink">
              Your account, locked to your face
            </h3>
            <p className="mt-2 text-base leading-relaxed text-brand-muted">
              Sign in with your phone number and an OTP or a password, reset a forgotten one over
              OTP, and switch on biometric App Lock so orders, addresses and invoices need Face ID or
              a fingerprint before they open.
            </p>
          </Card>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_FACTS.map((fact, index) => (
            <StatTile
              key={fact.label}
              value={fact.value}
              unit={fact.unit}
              label={fact.label}
              tone={index === 1 ? 'accent' : 'brand'}
            />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 7. Track everything                                              */}
      {/* ---------------------------------------------------------------- */}
      <Section id="orders" tone="white" className={ANCHOR_OFFSET}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="My Orders"
              title="Five kinds of order. One place to find them."
              subtitle="Profile → My Orders splits into Buy, Sell, Pickup, Enquiry and Service — and each of those filters down to Pending, Completed and Cancelled, so nothing quietly disappears."
              align="left"
            />

            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: ListChecks,
                  title: 'Full service event history',
                  body: 'Not just a status badge — the complete timeline of every event on the job.',
                },
                {
                  icon: BadgeCheck,
                  title: 'Estimate approval in-app',
                  body: 'The shop quotes, you approve. Work does not start on a price you have not seen.',
                },
                {
                  icon: Receipt,
                  title: 'Receipt and invoice on file',
                  body: 'Your service receipt and invoice stay attached to the order after delivery.',
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-700">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-brand-ink">{item.title}</p>
                    <p className="mt-1 text-base leading-relaxed text-brand-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Card hover={false} padded={false} className="overflow-hidden">
            <div className="border-b border-brand-line bg-brand-soften px-5 py-4">
              <p className="text-sm font-bold text-brand-ink">My Orders</p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-brand-line px-5 py-4">
              {ORDER_TABS.map((tab, index) => (
                <span
                  key={tab}
                  className={cx(
                    'rounded-full px-3 py-1.5 text-xs font-bold',
                    index === 0
                      ? 'bg-brand-600 text-white'
                      : 'bg-brand-soften text-brand-muted'
                  )}
                >
                  {tab}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-4">
              {ORDER_STATUSES.map((status, index) => (
                <span
                  key={status}
                  className={cx(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    index === 0
                      ? 'border-accent-300 bg-accent-50 text-accent-700'
                      : 'border-brand-line text-brand-muted'
                  )}
                >
                  {status}
                </span>
              ))}
            </div>

            <div className="space-y-3 px-5 pb-6">
              {TICKET_LIFECYCLE.slice(0, 4).map((stage, index) => (
                <div
                  key={stage.status}
                  className="flex items-center gap-3 rounded-2xl border border-brand-line p-4"
                >
                  <span
                    className={cx(
                      'h-2.5 w-2.5 shrink-0 rounded-full',
                      index === 0 ? 'bg-brand-600' : 'bg-brand-strong'
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-brand-ink">{stage.status}</p>
                    <p className="truncate text-xs text-brand-muted">{stage.description}</p>
                  </div>
                  <Check
                    className={cx(
                      'h-4 w-4 shrink-0',
                      index === 0 ? 'text-brand-600' : 'text-brand-subtle'
                    )}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 8. FAQ teaser                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Section id="faq" tone="page" className={ANCHOR_OFFSET}>
        <SectionHeading
          eyebrow="Questions"
          title="The things people ask first"
          subtitle="Straight answers about booking, pickup, pricing and getting your device back."
        />

        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {faqTeaser.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-3xl border border-brand-line bg-white p-5 shadow-soft transition open:shadow-lift sm:p-6"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl text-base font-bold text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 sm:text-lg [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-700 transition motion-reduce:transition-none group-open:rotate-90"
                  aria-hidden="true"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </summary>
              <p className="mt-3 text-base leading-relaxed text-brand-muted">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold text-brand-700 transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            Read all {FAQS.length} questions
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* 9. Closing CTA                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="white">
        <CTABand
          className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800"
          title={BRAND.appsStatus}
          subtitle="Tell us where to reach you and we will let you know the moment the GGFIX customer app goes live. Run a repair shop? There is a 15-day free trial waiting with your name on it."
          primary={CTA.contact}
          secondary={CTA.forShops}
        />
      </Section>
    </>
  );
}
