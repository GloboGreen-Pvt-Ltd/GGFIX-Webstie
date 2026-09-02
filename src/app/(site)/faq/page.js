import { CalendarClock, IndianRupee, MapPin } from 'lucide-react';

import {
  Badge,
  Button,
  CTABand,
  Section,
  SectionHeading,
  cx,
  resolveIcon,
} from '@/components/site/ui';
import { BRAND, CTA, SUPPORT_CHANNELS, SUPPORT_TOPICS } from '@/lib/siteContent';

import FaqAccordion from './FaqAccordion';

export const metadata = {
  title: 'FAQ',
  description:
    'Answers about booking a repair, doorstep pickup, selling a device to multiple bidding shops, the 15-day GGFIX Free Trial, the ₹3,000-a-year Basic plan, KYC documents and account security.',
};

/* -------------------------------------------------------------------------- */
/* Local data — the three hard numbers people search this page for             */
/* -------------------------------------------------------------------------- */

const QUICK_FACTS = [
  {
    icon: CalendarClock,
    value: '15 days free',
    description:
      'The Free Trial is granted automatically the moment you register a shop. No card, nothing to cancel.',
    tone: 'brand',
  },
  {
    icon: IndianRupee,
    value: '₹3,000 a year',
    description:
      'The Basic plan for one shop. From your second shop onwards it is ₹2,500 per shop per year.',
    tone: 'accent',
  },
  {
    icon: MapPin,
    value: '20 km radius',
    description:
      'How far the customer app looks when it shows you pickup-enabled repair shops and their ratings.',
    tone: 'brand',
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function FaqPage() {
  return (
    <>
      {/* 1 — Header ------------------------------------------------------- */}
      <Section tone="soft">
        <SectionHeading
          as="h1"
          eyebrow="Help centre"
          title={
            <>
              Straight answers, for both sides of the counter.{' '}
              <span className="text-brand-700">No small print.</span>
            </>
          }
          subtitle="The questions we actually get asked — how a repair moves from booking to delivery, why several shops bid on the phone you are selling, what the Free Trial really includes, and what happens when you outgrow it. Filter by who you are, or search the whole list."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {QUICK_FACTS.map((fact) => {
            const Icon = fact.icon;
            const isAccent = fact.tone === 'accent';
            return (
              <div
                key={fact.value}
                className="rounded-3xl border border-brand-line bg-white p-6 shadow-soft"
              >
                <span
                  className={cx(
                    'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
                    isAccent ? 'bg-accent-soft text-accent-600' : 'bg-brand-soft text-brand-700'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p
                  className={cx(
                    'mt-4 text-xl font-extrabold tracking-tight sm:text-2xl',
                    isAccent ? 'text-accent-600' : 'text-brand-ink'
                  )}
                >
                  {fact.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{fact.description}</p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-prose text-center text-sm leading-relaxed text-brand-muted">
          One thing worth saying up front: GGFIX has no online checkout. Plans are set up by our
          team, so nothing is ever charged to a card you saved.
        </p>
      </Section>

      {/* 2 — The questions ------------------------------------------------ */}
      <Section id="questions" tone="white">
        <SectionHeading
          eyebrow="Frequently asked"
          title="Find your question"
          subtitle="Pick a topic or start typing. Every answer describes what the apps do today — nothing here is a roadmap promise."
        />
        <FaqAccordion />
      </Section>

      {/* 3 — Still need help? --------------------------------------------- */}
      <Section tone="dark">
        <SectionHeading
          inverted
          eyebrow="Still need help?"
          title="Talk to a person instead."
          subtitle="If the answer is not above, it is usually faster to just ask. These are the things support handles most, and the three ways to reach us."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {SUPPORT_TOPICS.map((topic) => {
            const Icon = resolveIcon(topic.icon);
            return (
              <div
                key={topic.key}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 transition motion-safe:hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                </span>
                <h3 className="mt-4 text-base font-bold text-white sm:text-lg">{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-100">{topic.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-4xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Badge tone="inverted" icon="Headset">
                Support
              </Badge>
              <p className="mt-3 text-lg font-bold text-white sm:text-xl">
                Call, WhatsApp or email {BRAND.company}.
              </p>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-brand-100">
                Shop owners can also use this to get a plan set up, ask about KYC documents, or move
                an existing shop onto GGFIX.
              </p>
            </div>
            <Button href={CTA.contact.href} variant="white" size="lg" icon="ArrowRight">
              {CTA.contact.label}
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {SUPPORT_CHANNELS.map((channel) => {
              const Icon = resolveIcon(channel.icon);
              const isWeb = channel.href.startsWith('http');
              return (
                <li key={channel.key}>
                  <a
                    href={channel.href}
                    {...(isWeb
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-brand-900/40 px-4 py-3.5 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-brand-100">
                        {channel.label}
                      </span>
                      <span className="block truncate text-sm font-bold text-white">
                        {channel.value}
                      </span>
                      {isWeb ? <span className="sr-only">(opens in a new tab)</span> : null}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* 4 — Closing CTA --------------------------------------------------- */}
      <Section tone="page">
        <CTABand
          title="Read enough? Start the 15-day trial."
          subtitle={`${BRAND.taglineLong} Register your shop and the Free Trial begins on its own — the apps are ${BRAND.appsStatus.toLowerCase()}.`}
          primary={CTA.startTrial}
          secondary={CTA.seePricing}
        />
      </Section>
    </>
  );
}
