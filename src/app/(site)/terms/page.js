import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Handshake,
  IndianRupee,
  Landmark,
  Mail,
  MessageCircle,
  Phone,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CTABand,
  Prose,
  Section,
  SectionHeading,
  cx,
} from '@/components/site/ui';
import { BRAND, CTA, LEGAL_UPDATED } from '@/lib/siteContent';

export const metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms that govern use of the GGFIX customer app, the GGFIX shop app and the GGFIX platform operated by GloboGreen — accounts, repairs, quotations, pickup, subscriptions, KYC and liability.',
};

/* Sourced from siteContent so Terms and Privacy can never show different dates. */
const LAST_UPDATED = `Last updated: ${LEGAL_UPDATED}`;

/* -------------------------------------------------------------------------- */
/* Clause index — drives both the table of contents and the heading numbers    */
/* -------------------------------------------------------------------------- */

const SECTIONS = [
  { id: 'acceptance', title: 'Acceptance of these terms' },
  { id: 'who-we-are', title: 'Who we are' },
  { id: 'what-ggfix-is', title: 'What GGFIX is — and what it is not' },
  { id: 'accounts', title: 'Accounts, OTP login and app lock' },
  { id: 'customer-role', title: 'Your responsibilities as a customer' },
  { id: 'shop-role', title: 'Responsibilities of repair shops' },
  { id: 'quotations', title: 'Quotations, estimates and the final price' },
  { id: 'device-data', title: 'Device data, backups and content' },
  { id: 'device-security', title: 'Device security PINs and patterns' },
  { id: 'pickup', title: 'Doorstep pickup service' },
  { id: 'selling', title: 'Selling a device and multi-shop quotations' },
  { id: 'buying', title: 'Buying refurbished devices and accessories' },
  { id: 'subscriptions', title: 'Shop subscriptions, free trial and billing' },
  { id: 'kyc', title: 'KYC and shop verification' },
  { id: 'acceptable-use', title: 'Acceptable use' },
  { id: 'intellectual-property', title: 'Intellectual property and content' },
  { id: 'liability', title: 'Availability, changes and limitation of liability' },
  { id: 'governing-law', title: 'Governing law, disputes and contact' },
];

const INDEX = SECTIONS.reduce((map, section, i) => {
  map[section.id] = { ...section, n: i + 1 };
  return map;
}, {});

/** Numbered clause heading with a stable anchor id, kept in sync with SECTIONS. */
function Clause({ id }) {
  const clause = INDEX[id];
  return (
    <h2 id={clause.id} className="scroll-mt-28">
      <span className="text-brand-600">{clause.n}.</span> {clause.title}
    </h2>
  );
}

/* -------------------------------------------------------------------------- */
/* Plain-language summary strip                                                */
/* -------------------------------------------------------------------------- */

const SUMMARY = [
  {
    icon: Handshake,
    title: 'GGFIX is the platform, not the repairer',
    description:
      'Every repair, price and sale is agreed directly between you and an independent shop. We build the software that connects you and keeps the ticket honest.',
  },
  {
    icon: IndianRupee,
    title: 'Estimates are estimates',
    description:
      'A quotation is an informed guess until you approve it in the app. If the shop finds more damage after diagnosis, you get a revised estimate before any extra work starts.',
  },
  {
    icon: ShieldCheck,
    title: 'Back up your phone first',
    description:
      'Repairs can require a reset or a board-level fix. Photos, chats and files are your responsibility — take a backup before you hand the device over.',
  },
  {
    icon: Store,
    title: 'Shops subscribe, customers don’t',
    description:
      'Customers use GGFIX free. Shops get a 15-day free trial, then ₹3,000 per year on Basic. Activation is handled by our team — there is no online payment gateway yet.',
  },
];

/* -------------------------------------------------------------------------- */
/* Contact tiles for the dark band                                             */
/* -------------------------------------------------------------------------- */

const CONTACT_TILES = [
  { icon: Mail, label: 'Email', value: BRAND.email, href: BRAND.emailHref },
  { icon: Phone, label: 'Phone', value: BRAND.phone, href: BRAND.phoneHref },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: BRAND.whatsapp,
    href: BRAND.whatsappHref,
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function TermsPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="soft" className="pb-12 sm:pb-14 lg:pb-16">
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Legal"
          title="Terms & Conditions"
          subtitle={`The agreement between you, ${BRAND.company} and the independent repair shops you meet on ${BRAND.name}. Written to be read, not skimmed.`}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge icon={CalendarClock}>{LAST_UPDATED}</Badge>
          <Badge tone="neutral" icon={ScrollText}>
            {SECTIONS.length} sections
          </Badge>
          <Badge tone="neutral" icon={Landmark}>
            Governed by Indian law
          </Badge>
        </div>

        <div className="mt-8 rounded-3xl border border-accent-200 bg-accent-50 p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-700"
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-brand-ink sm:text-lg">
                Please read this in full — it is a general template
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-ink/80 sm:text-base">
                This document sets out the general rules for using {BRAND.name}. It is written to
                cover a marketplace that serves many independent repair shops across India, so it is
                deliberately broad. It is not legal advice, and it does not replace the specific
                job card, warranty slip or invoice a shop gives you for an individual repair or
                sale. Customers should read it before booking a service, and shop owners should read
                it before onboarding their shop and staff. If any clause here conflicts with a
                written agreement you have signed with {BRAND.company}, that signed agreement wins.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Plain-language summary                                            */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="page" className="py-12 sm:py-14 lg:py-16">
        <SectionHeading
          align="left"
          eyebrow="In plain English"
          title="The four things people ask about most"
          subtitle="A short summary for orientation only. The numbered clauses below are the terms that actually apply."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SUMMARY.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="h-full">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-700"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-brand-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* The terms themselves                                              */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="white" id="terms">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Table of contents */}
          <nav aria-label="Table of contents" className="lg:col-span-4">
            <div className="rounded-3xl border border-brand-line bg-brand-page p-5 shadow-soft sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                On this page
              </p>
              <ol className="mt-4 space-y-1">
                {SECTIONS.map((section, i) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={cx(
                        'flex gap-3 rounded-xl px-3 py-2 text-sm text-brand-muted transition',
                        'hover:bg-brand-soft hover:text-brand-800',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2'
                      )}
                    >
                      <span className="w-5 shrink-0 text-right font-semibold text-brand-600 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0">{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-5 border-t border-brand-line pt-4 text-xs font-medium text-brand-muted">
                {LAST_UPDATED} · Effective for all {BRAND.name} apps and services.
              </p>
            </div>
          </nav>

          {/* Body */}
          <div className="lg:col-span-8">
            <Prose>
              <Clause id="acceptance" />
              <p>
                These Terms &amp; Conditions (the <strong>“Terms”</strong>) govern your access to and
                use of the {BRAND.name} platform, including the {BRAND.customerAppName} mobile app,
                the {BRAND.shopAppName} app used by shop owners and their staff, the {BRAND.name}{' '}
                administrative portal, and {BRAND.website}. By creating an account, logging in with a
                one-time password, booking a repair, requesting a pickup, listing a device for sale,
                or operating a shop on the platform, you confirm that you have read these Terms and
                agree to be bound by them.
              </p>
              <p>
                If you do not agree, please do not use {BRAND.name}. If you are accepting these Terms
                on behalf of a shop, a company or a partnership, you confirm that you are authorised
                to bind that business, and “you” in these Terms means that business as well as you
                personally.
              </p>
              <p>
                You must be at least 18 years old to hold a {BRAND.name} account. Shop owners and
                employees must additionally hold whatever local registrations and licences their
                business requires.
              </p>

              <Clause id="who-we-are" />
              <p>
                {BRAND.name} is a product of <strong>{BRAND.company}</strong>, operating in India.
                Where these Terms say “we”, “us” or “our”, they mean {BRAND.company} as the operator
                of the {BRAND.name} platform. Where they say “shop”, “repair shop” or “partner shop”,
                they mean an independent business that has registered on {BRAND.name} to receive
                bookings, buy or sell devices, and manage its own staff and operations.
              </p>
              <p>
                You can reach us at <a href={BRAND.emailHref}>{BRAND.email}</a>, on{' '}
                <a href={BRAND.phoneHref}>{BRAND.phone}</a>, or through the website at{' '}
                <a href={BRAND.websiteUrl} target="_blank" rel="noopener noreferrer">
                  {BRAND.website}
                </a>
                .
              </p>

              <Clause id="what-ggfix-is" />
              <p>
                {BRAND.name} is a technology platform. We provide the software that lets a customer
                describe a device and a fault, discover repair shops nearby, request a doorstep
                pickup, receive quotations, track a job through its lifecycle, and pay the shop for
                the work. We also provide the shop-side software that runs bookings, technicians,
                attendance, inventory, invoices and reports.
              </p>
              <p>
                <strong>
                  We are not a repair shop, a refurbisher, a buyer or a seller of devices.
                </strong>{' '}
                We do not diagnose faults, hold spare parts, carry out repairs, set prices, or take
                ownership of any device. The repair contract, the sale contract and the price are
                agreed directly between the customer and the independent shop. The shop is solely
                responsible for the quality of its workmanship, the parts it fits, the grading of any
                device it buys or sells, and any warranty it offers.
              </p>
              <p>
                Listing a shop on {BRAND.name}, showing its distance, or displaying its ratings is
                not an endorsement, certification or guarantee by us of that shop’s work. We may
                verify a shop’s identity documents (see clause {INDEX.kyc.n}), but verification of
                paperwork is not a verification of repair quality.
              </p>

              <Clause id="accounts" />
              <p>
                Accounts are created with a mobile number or an email address. Depending on the app
                and the flow, you sign in with a password or with a one-time password (OTP) sent to
                your registered mobile number or email. Forgotten passwords are reset through the
                same OTP flow.
              </p>
              <ul>
                <li>
                  Keep your OTP private. Anyone with your OTP can access your account, your orders
                  and your addresses. We will never ask you for your OTP or password by phone, email
                  or chat.
                </li>
                <li>
                  You are responsible for everything done through your account, including actions
                  taken by staff you provision on a shop account.
                </li>
                <li>
                  Both apps offer an optional biometric App Lock (Face ID, fingerprint, pattern or
                  PIN) that protects the app on your own device. It is a convenience feature layered
                  on top of your login — it does not replace keeping your phone secure.
                </li>
                <li>
                  Give us accurate details. Wrong mobile numbers and incomplete addresses are the
                  most common reason a pickup fails or a device is delivered late.
                </li>
                <li>
                  Tell us immediately at <a href={BRAND.emailHref}>{BRAND.email}</a> if you believe
                  your account has been used without your permission.
                </li>
              </ul>

              <Clause id="customer-role" />
              <p>When you use {BRAND.name} as a customer, you agree to:</p>
              <ul>
                <li>
                  Describe the device and the fault honestly, including any earlier repair, water
                  exposure, drop damage or third-party parts. Undisclosed prior damage is the single
                  biggest cause of a revised estimate.
                </li>
                <li>
                  Only submit devices that you own or are authorised to hand over. Shops may refuse a
                  device where ownership cannot be established, and may be required to report devices
                  reported lost or stolen.
                </li>
                <li>
                  Remove SIM cards, memory cards and any accessory you do not want collected, unless
                  the shop has asked for them.
                </li>
                <li>
                  Be reachable during your chosen pickup or delivery slot, and provide access to the
                  address you entered.
                </li>
                <li>
                  Respond to estimate-approval requests. A job stays in a pending state until you
                  approve or decline the estimate, and shops may charge an agreed diagnostic or
                  handling fee if you decline after work has begun.
                </li>
                <li>
                  Pay the shop the agreed amount on the terms stated on your invoice, and collect
                  your device within the time the shop specifies.
                </li>
              </ul>

              <Clause id="shop-role" />
              <p>
                A shop that registers on {BRAND.name} operates as an independent business, not as an
                agent, employee, franchisee or partner of {BRAND.company}. By onboarding, the shop
                agrees to:
              </p>
              <ul>
                <li>
                  Hold and maintain the registrations, licences and tax registrations required for
                  its business, and to issue proper invoices for the work it performs.
                </li>
                <li>
                  Keep booking statuses truthful and current through the full lifecycle — Service
                  Accepted, Technician Assigned, In Service Process, Work Completed, Out for Delivery
                  and Delivered — so customers are not misled by a stale timeline.
                </li>
                <li>
                  Handle customer devices, data and security credentials with care, use them only for
                  the job in hand, and return every part and accessory that was collected.
                </li>
                <li>
                  Disclose the grade, condition and parts used for any refurbished device or
                  accessory it sells, and honour any warranty it offers in its own name.
                </li>
                <li>
                  Ensure that its technicians, pickup agents and other staff comply with these Terms;
                  the shop remains responsible for their conduct.
                </li>
                <li>
                  Provide accurate KYC documents, shop details and bank information, and keep them up
                  to date.
                </li>
              </ul>
              <p>
                Attendance, geofencing, leave, payroll and other workforce features in the shop app
                are tools for the shop to run its own business. The shop, not {BRAND.company}, is the
                employer of its staff and is responsible for complying with employment, wage and
                privacy law.
              </p>

              <Clause id="quotations" />
              <p>
                Every price shown before a device is inspected is an <strong>estimate</strong>. This
                includes the price estimate generated during the booking wizard, the indicative
                repair pricing shown in the customer app, and any figure quoted over chat.
              </p>
              <ul>
                <li>
                  <strong>Estimates are non-binding until accepted.</strong> A quotation becomes a
                  binding price only when you approve it in the app, or in writing, after the shop
                  has physically inspected the device.
                </li>
                <li>
                  If diagnosis reveals additional damage — a swollen battery, board-level corrosion,
                  a previously replaced display — the shop must send a revised estimate and wait for
                  your approval before continuing. Work performed without your approval is not
                  chargeable to you.
                </li>
                <li>
                  Part prices move. A quotation may lapse if it is not accepted within the validity
                  period the shop states.
                </li>
                <li>
                  Taxes are charged as applicable and are shown on the shop’s invoice. Any warranty
                  on parts or labour is given by the shop, on the terms printed on that invoice.
                </li>
                <li>
                  Payment for a repair or a purchase is settled between you and the shop.{' '}
                  {BRAND.name} does not currently operate an online payment gateway and does not
                  collect repair charges on a shop’s behalf.
                </li>
              </ul>

              <Clause id="device-data" />
              <p>
                <strong>
                  Backing up your device is your responsibility, and it is the most important thing
                  you can do before a repair.
                </strong>{' '}
                Many repairs — software faults, dead boards, motherboard-level work, display or
                storage replacement — can result in the partial or total loss of the data on the
                device, and some require a factory reset to complete or to test.
              </p>
              <ul>
                <li>
                  Take a full backup of photos, videos, chats, contacts, documents and app data
                  before you hand your device to a shop or a pickup agent.
                </li>
                <li>
                  Sign out of, or note the credentials for, any account lock (for example an activation
                  lock or a manufacturer account) that would prevent the device being tested after
                  repair.
                </li>
                <li>
                  Neither {BRAND.company} nor the shop is liable for loss of data, media, licences or
                  configuration arising from a repair, a reset, a diagnostic procedure or a
                  hardware failure, except where the loss is caused by the shop’s proven negligence
                  and the loss was reasonably foreseeable.
                </li>
                <li>
                  Shops must not copy, retain, browse or share the contents of a customer device
                  beyond what is strictly necessary to complete and test the job.
                </li>
              </ul>

              <Clause id="device-security" />
              <p>
                During booking, a shop may ask for your device unlock PIN, password or pattern. This
                is collected for one reason only: a technician cannot verify a touchscreen, a
                fingerprint sensor, a camera or a network fault on a device that cannot be unlocked.
              </p>
              <ul>
                <li>
                  Security credentials are captured against the specific booking, are used only for
                  diagnosing, repairing and testing that device, and must not be used for any other
                  purpose.
                </li>
                <li>
                  You may decline to share a PIN. The shop may then be unable to complete certain
                  tests, and any warranty on the outcome may be limited accordingly.
                </li>
                <li>
                  Change your PIN or password after your device is returned. This is good practice
                  regardless of who serviced the device.
                </li>
                <li>
                  Do not leave banking, wallet or authenticator apps unprotected on a device you are
                  handing over. Remove or lock them first.
                </li>
              </ul>

              <Clause id="pickup" />
              <p>
                Doorstep pickup is offered by pickup-enabled shops within their own service area.
                Where a shop offers it, an agent collects your device from the address you choose and
                returns it after the repair.
              </p>
              <ul>
                <li>
                  Availability depends on your location, the shop’s configured pickup zone and slot
                  timings, and the agent’s workload. A slot is a target window, not a guaranteed
                  arrival time; traffic, weather and earlier jobs can shift it.
                </li>
                <li>
                  The device is checked and recorded at handover. Confirm the recorded condition,
                  accessories and IMEI at that moment — it is the reference point if a dispute arises
                  later.
                </li>
                <li>
                  Pickup agents may be required to reach the shop location before a handover can be
                  marked complete, and the app may record location data as part of that check.
                </li>
                <li>
                  If nobody is available at the address during the slot, or the address cannot be
                  reached, the pickup may be rescheduled or cancelled and a visit charge may apply on
                  the terms the shop stated at booking.
                </li>
                <li>
                  Pickup and drop charges, where applicable, are set by the shop and appear on your
                  estimate or invoice.
                </li>
              </ul>

              <Clause id="selling" />
              <p>
                When you list a device to sell, you answer a structured set of questions about its
                working condition, screen, functional issues, configuration, accessories and
                warranty, and upload photos. Nearby shops then send you quotations, and you choose
                which one to accept.
              </p>
              <ul>
                <li>
                  <strong>A quotation is an offer based on what you declared.</strong> It is
                  provisional. The buying shop re-inspects the device at handover, and may revise or
                  withdraw its offer if the actual condition differs from your answers or photos.
                </li>
                <li>
                  You must legally own the device and be entitled to sell it. Shops may ask for proof
                  of purchase, and may refuse any device whose IMEI or ownership cannot be verified.
                </li>
                <li>
                  Remove your accounts, sign out of cloud services, disable activation locks and
                  erase your data before handover. A device that is still account-locked usually
                  cannot be bought.
                </li>
                <li>
                  You are free to accept the best quotation or none at all. There is no obligation to
                  sell, and there is no fee for receiving quotations.
                </li>
                <li>
                  The sale is a contract between you and that shop. Payment, its timing and its
                  method are agreed between you and the shop; {BRAND.company} is not a party to the
                  sale and does not hold or route the money.
                </li>
              </ul>

              <Clause id="buying" />
              <p>
                Refurbished devices, spare parts and accessories offered on {BRAND.name} are listed,
                described, priced, stocked and dispatched by independent shops.
              </p>
              <ul>
                <li>
                  The selling shop is responsible for the accuracy of every listing — grade,
                  condition, specification, included accessories and photographs.
                </li>
                <li>
                  Any warranty, return window, replacement policy or refund is offered by the selling
                  shop on the terms it publishes, and is claimed from that shop.
                </li>
                <li>
                  Product images may be representative. Refurbished devices are used goods and may
                  show cosmetic wear consistent with the grade stated.
                </li>
                <li>
                  Where a listing is obviously mispriced or misdescribed, the shop may cancel the
                  order and refund any amount already paid to it.
                </li>
              </ul>

              <Clause id="subscriptions" />
              <p>
                Customers use {BRAND.name} free of charge. Shops pay a subscription to use the shop
                app and the platform features that come with it.
              </p>
              <ul>
                <li>
                  <strong>Free Trial — ₹0 for 15 days.</strong> Granted automatically the moment a
                  shop owner registers. No card is required. The trial permits up to 2 shops, up to 3
                  employees per shop, and up to 5 Sell orders; Buy is unlimited. Pickup Service is
                  not included in the trial.
                </li>
                <li>
                  <strong>Basic — ₹3,000 per year for one shop.</strong> When you operate two or more
                  shops, each shop is ₹2,500 per year — so 2 shops are ₹5,000, 3 shops ₹7,500, 4
                  shops ₹10,000 and 5 shops ₹12,500 per year. Basic includes new service bookings,
                  Pickup Service, unlimited Buy, unlimited Sell orders, unlimited employees and
                  multiple shops.
                </li>
                <li>
                  <strong>Activation is handled by the {BRAND.name} team.</strong> There is no online
                  payment gateway on the platform today, so plans cannot be purchased from inside
                  the app. To start or renew a plan, contact us — we will confirm the amount, collect
                  it offline and activate the subscription on your account.
                </li>
                <li>
                  Subscriptions run for the period stated on activation. When a trial or paid period
                  ends without renewal, access to paid features may be restricted while your existing
                  business records remain in your account.
                </li>
                <li>
                  Prices are quoted in Indian Rupees and may be revised on notice. A revised price
                  applies from your next renewal, never mid-term.
                </li>
                <li>
                  Fees already paid for a subscription period are non-refundable unless the law
                  requires otherwise or we agree otherwise in writing. Use the 15-day free trial to
                  satisfy yourself that {BRAND.name} fits your shop before paying.
                </li>
              </ul>

              <Clause id="kyc" />
              <p>
                Shops are asked to complete a KYC (Know Your Customer) check before they can operate
                fully on the platform. The onboarding flow collects, at minimum:
              </p>
              <ul>
                <li>
                  <strong>Aadhar</strong> — required, for identity of the owner.
                </li>
                <li>
                  <strong>PAN</strong> — required, for tax identity of the business or owner.
                </li>
                <li>
                  <strong>GST or Udyam</strong> — at least one of the two is required, as proof of
                  business registration.
                </li>
              </ul>
              <p>
                Documents must be genuine, legible, current and belong to the shop or its owner.
                Submitting forged, altered or third-party documents is a serious breach of these
                Terms and will result in permanent removal from the platform, in addition to any
                legal consequences. Documents are reviewed before a shop is marked verified, and we
                may ask for clarification or re-upload. Employees may separately be asked to upload
                their own identity documents by the shop that employs them. All such documents are
                handled in line with our Privacy Policy.
              </p>

              <Clause id="acceptable-use" />
              <p>You agree not to use {BRAND.name} to:</p>
              <ul>
                <li>
                  Impersonate another person or shop, create accounts with false details, or operate
                  an account on behalf of a suspended user.
                </li>
                <li>
                  List, sell or hand over a device that is stolen, lost, IMEI-tampered, or that you
                  are not entitled to deal in.
                </li>
                <li>
                  Post abusive, threatening, obscene, misleading or unlawful content in chat,
                  listings, notes, reviews or support messages.
                </li>
                <li>
                  Manipulate ratings, place fake bookings or fake quotations, or take a conversation
                  off-platform in order to defraud the other party.
                </li>
                <li>
                  Scrape, mirror, reverse-engineer, decompile or resell any part of the platform, or
                  access it through automated means without our written permission.
                </li>
                <li>
                  Interfere with the security or integrity of the service, probe it for
                  vulnerabilities without authorisation, or upload malicious code.
                </li>
                <li>
                  Use customer contact details, addresses or device data obtained through the
                  platform for marketing or any purpose unrelated to the job.
                </li>
              </ul>
              <p>
                We may investigate suspected breaches and may suspend or terminate access — for a
                customer account, a shop account, or an individual staff login — where we reasonably
                believe these Terms have been broken or where suspension is needed to protect users.
              </p>

              <Clause id="intellectual-property" />
              <p>
                The {BRAND.name} name, the {BRAND.company} name, our logos, the apps, the admin
                portal, the site and all underlying software, design and content are owned by{' '}
                {BRAND.company} or our licensors and are protected by intellectual property law. You
                get a limited, revocable, non-exclusive, non-transferable licence to use the apps for
                their intended purpose while your account is in good standing. Nothing else is
                granted.
              </p>
              <p>
                Content you submit — device photographs, listings, chat messages, shop details,
                logos, reviews — remains yours. You grant us a licence to host, store, display and
                transmit that content as far as needed to operate the platform, provide support and
                meet legal obligations. You confirm that you have the rights to everything you
                upload. Device model images, brand names and specifications are the property of their
                respective manufacturers and are shown for identification only.
              </p>

              <Clause id="liability" />
              <p>
                We work to keep {BRAND.name} available and correct, but the platform is provided on
                an “as is” and “as available” basis. We do not warrant that it will be uninterrupted,
                error-free, or that any particular shop, part, slot or quotation will be available.
                Features may be added, changed, restricted or withdrawn as the product develops, and
                planned maintenance may take services offline.
              </p>
              <p>To the fullest extent permitted by law:</p>
              <ul>
                <li>
                  {BRAND.company} is not liable for the acts or omissions of an independent shop,
                  including the quality of a repair, the parts used, delay, damage caused during
                  service, the grading of a device, a refused warranty claim, or a price dispute.
                  Those claims lie against the shop.
                </li>
                <li>
                  We are not liable for indirect, incidental, special or consequential loss, or for
                  loss of profit, business, goodwill, data or anticipated savings.
                </li>
                <li>
                  Where liability cannot be excluded, our total aggregate liability to a customer is
                  limited to the amount that customer paid to {BRAND.company} in the twelve months
                  before the claim — which, for customers who use {BRAND.name} free of charge, is
                  nil. For a shop, it is limited to the subscription fees that shop paid to us in the
                  twelve months before the claim.
                </li>
                <li>
                  Nothing in these Terms excludes liability for fraud, or for anything that cannot
                  lawfully be excluded under Indian law, including rights available to a consumer
                  under the Consumer Protection Act, 2019.
                </li>
              </ul>
              <p>
                You agree to indemnify {BRAND.company} against claims, losses and reasonable legal
                costs arising from your breach of these Terms, your misuse of the platform, or — if
                you are a shop — from the services you provide to customers you met through{' '}
                {BRAND.name}.
              </p>

              <Clause id="governing-law" />
              <p>
                These Terms are governed by the laws of India. The courts of India have exclusive
                jurisdiction over any dispute arising out of or in connection with them. Before
                starting formal proceedings, please write to us — most disputes about a booking, a
                quotation or a subscription are resolved quickly once we can see the ticket history.
              </p>
              <p>
                We may update these Terms as the product changes — new features, new plans, new legal
                requirements. The current version always sits on this page with its last-updated
                date, and material changes will be notified in the apps or by email. Continuing to
                use {BRAND.name} after an update means you accept the updated Terms. If you do not
                accept them, stop using the platform and close your account.
              </p>
              <p>
                Questions about anything on this page? Email{' '}
                <a href={BRAND.emailHref}>{BRAND.email}</a>, call or message us on{' '}
                <a href={BRAND.phoneHref}>{BRAND.phone}</a>, or use the{' '}
                <Link href="/contact">contact page</Link>. Please read our{' '}
                <Link href="/privacy">Privacy Policy</Link> as well — it explains what data we hold,
                why we hold it, and how long we keep it.
              </p>
              <p className="!mt-8 text-sm font-semibold text-brand-ink">{LAST_UPDATED}</p>
            </Prose>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Dark contact band                                                 */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="dark">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5">
            <SectionHeading
              align="left"
              inverted
              eyebrow="Need a human?"
              title="Talk to us before you sign anything"
              subtitle="If a clause here affects how you run your shop — subscriptions, KYC, pickup zones, staff logins — ask us. We would rather explain it now than argue about it later."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={CTA.contact.href} variant="white" icon={ArrowRight}>
                {CTA.contact.label}
              </Button>
              {/* Not `variant="ghost"` + a text-white override: `.text-brand-700`
                  and `.hover\:bg-brand-soft` are emitted AFTER `.text-white` /
                  `.hover\:bg-white\/10` in the compiled sheet, so the ghost
                  variant wins the cascade and this renders brand-700 on
                  brand-900 (~1.6:1). Same transparent-on-dark pattern as the
                  secondary buttons on /pricing and /contact. */}
              <Button
                href="/faq"
                className="border border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                Read the FAQ
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CONTACT_TILES.map((tile) => {
                const Icon = tile.icon;
                return (
                  <a
                    key={tile.label}
                    href={tile.href}
                    className={cx(
                      'block rounded-3xl border border-white/15 bg-white/5 p-5 transition',
                      'hover:border-white/30 hover:bg-white/10',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900'
                    )}
                  >
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-200">
                      {tile.label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-white">{tile.value}</p>
                  </a>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Smartphone, label: 'Customers pay nothing to use GGFIX' },
                { icon: Truck, label: 'Pickup terms are set by each shop' },
                { icon: BadgeCheck, label: 'Shops are KYC-checked before verification' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 px-4 py-3"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                    <span className="text-sm leading-snug text-brand-100">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA                                                       */}
      {/* ---------------------------------------------------------------- */}
      <Section tone="page">
        <CTABand
          title="Ready to put your shop on GGFIX?"
          subtitle={`Start with the 15-day free trial — no card required. Our team activates your plan when you are ready to move to Basic. ${BRAND.appsStatus}.`}
          primary={CTA.startTrial}
          secondary={CTA.seePricing}
        />
      </Section>
    </>
  );
}
