import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  ClipboardList,
  Cpu,
  Handshake,
  HardHat,
  Lock,
  MessageCircle,
  MessageSquare,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CTABand,
  FeatureCard,
  Section,
  SectionHeading,
  StatTile,
  cx,
} from '@/components/site/ui';
import { ABOUT, BRAND, CTA, PLATFORM_FACTS } from '@/lib/siteContent';

export const metadata = {
  title: 'About',
  description:
    'GloboGreen helps you repair, buy and sell mobile devices through a network of trusted nearby shops. Here is what GGFIX is, how the platform is built, and who it is for.',
};

/* -------------------------------------------------------------------------- */
/* Page-local content                                                          */
/* -------------------------------------------------------------------------- */

const HERO_POINTS = [
  'A customer app for repair, pickup, selling and buying',
  'A shop app that runs bookings, staff, stock and invoices',
  'One platform keeping both sides on the same ticket',
];

const THREE_SIDES = [
  {
    icon: Smartphone,
    title: 'The customer app',
    description:
      'Five tabs — Home, Repair, Sell, Buy and Profile. Book a repair on your exact model, hand the phone to a doorstep pickup agent, or list it for sale and let nearby shops bid for it.',
    points: [
      'Shop discovery inside a 20 km radius',
      'Live order tracking with a full event timeline',
      'Estimate approval before any work begins',
    ],
  },
  {
    icon: Store,
    title: 'The shop app',
    description:
      'A working counter system, not a dashboard. Intake by IMEI or QR scan, device PIN and missing parts recorded, technician assigned, invoice and label printed at handover.',
    points: [
      'Six-stage ticket lifecycle from accepted to delivered',
      'Employees, geofenced attendance, leave and payslips',
      'Inventory, pickup slots, zones and multi-shop switching',
    ],
  },
  {
    icon: Handshake,
    title: 'The platform between them',
    description:
      'Multi-tenant by design: every shop has its own customers, staff, stock and pricing, while device data, discovery and chat are shared platform-wide so a customer sees one consistent experience.',
    points: [
      'Shared master catalogue of brands, models and variants',
      'Direct customer-to-shop chat, inbox and threads',
      'KYC onboarding before a shop goes live',
    ],
  },
];

const STACK_LAYERS = [
  {
    icon: Smartphone,
    label: 'Mobile',
    title: 'React Native on Expo',
    description:
      'Three role-based experiences — customer, shop owner and technician — sharing one component system, with biometric App Lock, push notifications and camera-based IMEI and QR scanning.',
  },
  {
    icon: MonitorSmartphone,
    label: 'Web',
    title: 'Next.js management portal',
    description:
      'The admin side of the platform: shops, subscriptions, and the master device catalogue of categories, brands, series, models and variants that every app reads from.',
  },
  {
    icon: Cpu,
    label: 'Backend',
    title: 'Spring Boot on PostgreSQL',
    description:
      'Twelve independent services behind JWT authentication, each owning its own slice of the schema, so pickup or marketplace can change without touching bookings.',
  },
];

const SERVICES = [
  { icon: Lock, name: 'Auth', detail: 'JWT, OTP, roles' },
  { icon: ClipboardList, name: 'Orders', detail: 'Bookings & lifecycle' },
  { icon: Wrench, name: 'Tickets', detail: 'Repair jobs & notes' },
  { icon: Users, name: 'Users', detail: 'Customer accounts' },
  { icon: Store, name: 'Shops', detail: 'Tenants & KYC' },
  { icon: HardHat, name: 'Technicians', detail: 'Staff & attendance' },
  { icon: Boxes, name: 'Inventory', detail: 'Parts & stock' },
  { icon: ShoppingBag, name: 'Marketplace', detail: 'Buy, sell & chat' },
  { icon: Truck, name: 'Pickup', detail: 'Slots, zones, agents' },
  { icon: MessageSquare, name: 'Notifications', detail: 'Push & in-app feeds' },
  { icon: Wallet, name: 'Subscriptions', detail: 'Plans & renewals' },
  { icon: Cpu, name: 'Master data', detail: 'Device catalogue' },
];

const PRINCIPLES = [
  {
    icon: Handshake,
    tone: 'accent',
    title: 'Quotes should compete, not be dictated',
    description:
      'Selling a device on GGFIX sends your listing to several nearby shops. They each send a quotation, you compare them side by side and pick the one you want. The same instinct drives repair: browse shops within 20 km before you commit to one.',
  },
  {
    icon: Truck,
    tone: 'brand',
    title: 'The phone should come to you',
    description:
      'Doorstep pickup is a first-class flow, not an add-on. Choose a pickup-enabled shop, set an address and a slot, and follow the device through collection, arrival at the shop, diagnosis and return delivery.',
  },
  {
    icon: MessageCircle,
    tone: 'brand',
    title: 'The shop keeps its own customers',
    description:
      'We do not sit between a shop and the person it serves. Direct chat threads run from the customer app to the shop app, so quotes, questions and follow-ups stay a conversation between the two of them.',
  },
  {
    icon: ShieldCheck,
    tone: 'brand',
    title: 'Verified before visible',
    description:
      'Shops complete KYC onboarding — Aadhar and PAN, plus GST or Udyam — before they operate on the platform. Employees upload their own documents too, because someone is collecting a phone from a doorstep.',
  },
];

const AUDIENCES = [
  {
    icon: Smartphone,
    title: 'For customers',
    description:
      'Anyone with a phone that needs fixing, an old handset worth money, or an accessory to buy. Book a repair, approve the estimate, watch the ticket move and collect a proper invoice at the end.',
    href: '/',
    linkLabel: 'See what the app does',
  },
  {
    icon: Building2,
    title: 'For shop owners',
    description:
      'Single-counter shops and multi-branch chains alike. Bookings, technicians, employee attendance, salary and leave, inventory, pickup fleet, invoicing and reports — all under one login with shop switching.',
    href: '/shop',
    linkLabel: 'Explore the shop app',
  },
  {
    icon: HardHat,
    title: 'For technicians',
    description:
      'The same app in a technician view: only your assigned tickets, status updates, repair notes and photos from the bench, plus leave requests, KYC upload and your own attendance record.',
    href: '/shop',
    linkLabel: 'See the technician view',
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AboutPage() {
  return (
    <>
      {/* 1 — Hero */}
      <Section tone="soft">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading
              as="h1"
              align="left"
              eyebrow={`About ${BRAND.name}`}
              title={ABOUT.headline}
              subtitle={`${BRAND.company} helps you repair, buy and sell mobile devices through a network of trusted nearby shops.`}
            />
            <p className="mt-6 max-w-prose text-base leading-relaxed text-brand-muted sm:text-lg">
              {ABOUT.body[0]}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href={CTA.forShops.href} size="lg" icon={ArrowRight}>
                {CTA.forShops.label}
              </Button>
              <Button href={CTA.contact.href} variant="outline" size="lg">
                {CTA.contact.label}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card hover={false}>
              <div className="flex items-center gap-4">
                <Image
                  src={BRAND.logo}
                  alt={BRAND.logoAlt}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl object-contain"
                />
                <div className="min-w-0">
                  <p className="text-lg font-extrabold tracking-tight text-brand-ink">
                    {BRAND.name}
                  </p>
                  <p className="truncate text-sm font-medium text-brand-muted">
                    by {BRAND.company}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-base font-semibold leading-relaxed text-brand-ink">
                {BRAND.tagline}
              </p>
              <ul className="mt-6 space-y-3">
                {HERO_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-sm leading-relaxed text-brand-muted">{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-brand-line pt-5 text-sm font-medium text-brand-700">
                {BRAND.appsStatus}
              </p>
            </Card>
          </div>
        </div>
      </Section>

      {/* 2 — What we are building */}
      <Section tone="page">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_FACTS.map((fact, index) => (
            <StatTile
              key={fact.label}
              value={fact.value}
              unit={fact.unit}
              label={fact.label}
              tone={index === PLATFORM_FACTS.length - 1 ? 'accent' : 'brand'}
            />
          ))}
        </div>

        <div className="mt-16 sm:mt-20">
          <SectionHeading
            eyebrow="What we are building"
            title="A three-sided product, not a single app"
            subtitle={ABOUT.body[1]}
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {THREE_SIDES.map((side) => (
              <FeatureCard
                key={side.title}
                icon={side.icon}
                title={side.title}
                description={side.description}
                points={side.points}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* 3 — How the platform is built */}
      <Section tone="dark">
        <SectionHeading
          inverted
          align="left"
          eyebrow="Under the hood"
          title="How the platform is built"
          subtitle="We would rather tell you than let you guess. Nothing here is a marketing diagram — it is the architecture the apps actually run on."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {STACK_LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div
                key={layer.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge tone="inverted">{layer.label}</Badge>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-white">{layer.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-100">{layer.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-4xl border border-white/10 bg-white/5 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                The 12 backend services
              </h3>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-brand-100 sm:text-base">
                Each service owns its own tables in PostgreSQL and talks to the apps over a shared
                JWT session, which is why a shop can add a pickup fleet or a second branch without
                anything else being rebuilt.
              </p>
            </div>
            <Badge tone="inverted" className="self-start sm:self-auto">
              Spring Boot · PostgreSQL
            </Badge>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <li
                  key={service.name}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-brand-900/40 px-4 py-3"
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white"
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{service.name}</span>
                    <span className="block text-xs leading-relaxed text-brand-200">
                      {service.detail}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 max-w-prose text-sm leading-relaxed text-brand-100">
            {ABOUT.body[2]}
          </p>
        </div>
      </Section>

      {/* 4 — What we believe */}
      <Section tone="white">
        <SectionHeading
          eyebrow="What we believe"
          title="Four decisions that shaped the product"
          subtitle="These are not slogans. Each one is a flow you can point at inside the apps."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PRINCIPLES.map((principle, index) => {
            const Icon = principle.icon;
            return (
            <Card key={principle.title} className="h-full">
              <div className="flex items-start gap-4">
                <span
                  className={cx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    principle.tone === 'accent'
                      ? 'bg-accent-soft text-accent-700'
                      : 'bg-brand-soft text-brand-700'
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p
                    className={cx(
                      'text-sm font-bold',
                      principle.tone === 'accent' ? 'text-accent-600' : 'text-brand-600'
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-brand-ink sm:text-xl">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-muted sm:text-base">
                    {principle.description}
                  </p>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      </Section>

      {/* 5 — Who it is for */}
      <Section tone="page">
        <SectionHeading
          eyebrow="Who it is for"
          title="Three people use GGFIX every day"
          subtitle="The person whose phone is broken, the owner running the counter, and the technician on the bench. Every screen was written for one of them."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {AUDIENCES.map((audience) => {
            const Icon = audience.icon;
            return (
              <Card key={audience.title} className="flex h-full flex-col">
                <span
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-700"
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold tracking-tight text-brand-ink sm:text-xl">
                  {audience.title}
                </h3>
                <p className="mt-2 flex-1 text-base leading-relaxed text-brand-muted">
                  {audience.description}
                </p>
                <Link
                  href={audience.href}
                  className="mt-6 inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold text-brand-600 transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                >
                  {audience.linkLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>
            );
          })}
        </div>
        <div className="mt-10 flex justify-center">
          <Button href={CTA.startTrial.href} size="lg" icon={ArrowRight}>
            {CTA.startTrial.label}
          </Button>
        </div>
      </Section>

      {/* 6 — Contact band */}
      <Section tone="white">
        <CTABand
          title="Talk to the people building it"
          subtitle={`Questions about the platform, a shop you want onboarded, or an app you want early access to — write to ${BRAND.email} or call ${BRAND.phone}.`}
          primary={CTA.contact}
          secondary={CTA.seePricing}
        />
      </Section>
    </>
  );
}
