import {
  BadgeCheck,
  CalendarClock,
  Camera,
  Headset,
  Lock,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Receipt,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';

import {
  Badge,
  Card,
  CTABand,
  Prose,
  Section,
  SectionHeading,
  cx,
  resolveIcon,
} from '@/components/site/ui';
import { BRAND, CTA, LEGAL_UPDATED, SUPPORT_CHANNELS } from '@/lib/siteContent';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How GGFIX and GloboGreen collect, use, share and protect your information across the GGFIX customer app, the GGFIX shop app and the admin platform.',
};

/* -------------------------------------------------------------------------- */
/* Page-local content                                                          */
/* -------------------------------------------------------------------------- */

const DATA_CATEGORIES = [
  {
    icon: Users,
    title: 'Identity and contact details',
    description:
      'Your name, mobile number and email address. Shop owners also give a shop name, shop address and business contact numbers when they register.',
  },
  {
    icon: MapPin,
    title: 'Addresses',
    description:
      'The pickup and delivery addresses you save — house or building, street, district, taluk and PIN code — so a pickup agent can reach you.',
  },
  {
    icon: Smartphone,
    title: 'Device details',
    description:
      'Category, brand, series, model, variant, colour and storage. At shop intake the shop may also record the IMEI, and the unlock PIN or pattern if the repair needs the phone opened.',
  },
  {
    icon: Camera,
    title: 'Photos of devices',
    description:
      'Photos you upload of the handset you want to sell, and photos a technician takes of the device before, during and after a repair as service evidence.',
  },
  {
    icon: Headset,
    title: 'Voice notes',
    description:
      'The optional voice note you can record to describe the fault in your own words. It is attached to that one repair ticket so the technician can hear the complaint.',
  },
  {
    icon: Navigation,
    title: 'Precise location',
    description:
      'Only when you allow it — used to list pickup-enabled shops within about 20 km of you and to pre-fill a default delivery address. It is not tracked in the background.',
  },
  {
    icon: MessageCircle,
    title: 'Chat messages',
    description:
      'Messages, delivery and read status between you and a shop in the in-app chat, so both sides can see the same conversation history for an enquiry or an order.',
  },
  {
    icon: CalendarClock,
    title: 'Employee attendance location',
    description:
      'For shop staff only: the coordinates captured at the moment of a check-in or check-out punch, used to confirm the punch happened inside the shop geofence.',
  },
  {
    icon: Receipt,
    title: 'Service and order records',
    description:
      'Bookings, ticket status history, repair estimates and approvals, quotations, invoices and receipts — the record of what was done to your device and what it cost.',
  },
  {
    icon: Lock,
    title: 'Account security data',
    description:
      'Your login credentials, one-time passcodes issued to your mobile or email, and the session token your app holds while you stay signed in.',
  },
];

const PROMISES = [
  {
    icon: LockKeyhole,
    title: 'Biometric App Lock never leaves your phone',
    description:
      'When you turn on App Lock, your face or fingerprint is checked by your phone’s own secure hardware. GGFIX only receives a yes or no. No biometric template is ever uploaded, stored on our servers or shared with a shop.',
  },
  {
    icon: Navigation,
    title: 'Location is used on demand, not in the background',
    description:
      'We read your location when you open a screen that needs it — finding nearby pickup-enabled shops, or setting a default address. There is no background location tracking of customers in the GGFIX customer app.',
  },
  {
    icon: BadgeCheck,
    title: 'We do not sell your data',
    description:
      'GGFIX does not sell or rent personal information, and does not run advertising networks or third-party ad trackers inside the apps. Your details go to the shop you chose, and to the vendors that keep the platform running.',
  },
];

const SECTIONS = [
  { id: 'who-we-are', title: 'Who we are' },
  { id: 'scope', title: 'What this policy covers' },
  { id: 'what-we-collect', title: 'Information we collect' },
  { id: 'how-we-use', title: 'How we use your information' },
  { id: 'who-sees-it', title: 'Who can see your information' },
  { id: 'location', title: 'Location data' },
  { id: 'photos-audio', title: 'Photos, voice notes and camera access' },
  { id: 'app-lock', title: 'Biometric App Lock and device security data' },
  { id: 'authentication', title: 'Accounts, OTP and staying signed in' },
  { id: 'attendance', title: 'Employee data and attendance geofencing' },
  { id: 'retention', title: 'How long we keep your data' },
  { id: 'rights', title: 'Your rights and choices' },
  { id: 'children', title: 'Children' },
  { id: 'security', title: 'How we protect your data' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'How to contact us' },
];

/* -------------------------------------------------------------------------- */
/* Page-local components                                                       */
/* -------------------------------------------------------------------------- */

function PolicySection({ id, index, title, children }) {
  return (
    <>
      <h2 id={id} className="scroll-mt-28">
        <span className="mr-2 text-brand-600">{index}.</span>
        {title}
      </h2>
      {children}
    </>
  );
}

function DataCard({ icon: Icon, title, description }) {
  return (
    <Card className="h-full">
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-700"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-base font-bold text-brand-ink sm:text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted sm:text-base">{description}</p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function PrivacyPage() {
  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <Section tone="soft" className="pb-10 sm:pb-12 lg:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <Badge icon={ShieldCheck}>Privacy Policy</Badge>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl">
            Your phone, your data, your call.
          </h1>
          <p className="mx-auto mt-5 max-w-prose text-base leading-relaxed text-brand-muted sm:text-lg">
            {BRAND.name} is operated by {BRAND.company}. This policy explains exactly what the{' '}
            {BRAND.customerAppName} app, the {BRAND.shopAppName} app and the {BRAND.name} admin
            platform collect, why each piece of information is needed, and who gets to see it. It is
            written to describe what the product actually does — nothing more.
          </p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-700">
            Last updated: {LEGAL_UPDATED}
          </p>
        </div>
      </Section>

      {/* What we collect at a glance -------------------------------------- */}
      <Section tone="white">
        <SectionHeading
          eyebrow="At a glance"
          title="The ten things GGFIX collects"
          subtitle="Everything below is collected because a specific part of the product needs it to work. If a screen does not need it, we do not ask for it."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_CATEGORIES.map((item) => (
            <DataCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </Section>

      {/* Promises band ----------------------------------------------------- */}
      <Section tone="dark">
        <SectionHeading
          eyebrow="Where we draw the line"
          title="Three things we will not do"
          subtitle="These are limits built into how the apps are written, not just statements of intent."
          inverted
        />
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PROMISES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={cx(
                  'flex h-full flex-col rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8',
                  'transition motion-safe:hover:-translate-y-0.5'
                )}
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-100"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-100 sm:text-base">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Full policy ------------------------------------------------------- */}
      <Section tone="page" id="policy">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          {/* TOC */}
          <nav aria-label="Privacy policy contents" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
              On this page
            </p>
            <ol className="mt-4 space-y-1 border-l border-brand-line pl-4 text-sm">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-lg py-1.5 text-brand-muted transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                  >
                    <span className="mr-2 font-semibold text-brand-ink">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Body */}
          <Prose>
            <p className="text-lg text-brand-ink">
              <strong>Summary.</strong> We collect what a repair, pickup, sale or purchase genuinely
              requires — who you are, how to reach you, where to collect the device, what the device
              is and what is wrong with it. We share it with the one shop you choose. We keep it for
              as long as the service record needs to exist, and you can ask us to correct or delete
              it at any time.
            </p>

            <PolicySection index={1} id={SECTIONS[0].id} title={SECTIONS[0].title}>
              <p>
                {BRAND.name} is a platform built and operated by {BRAND.company} ({BRAND.website}).
                It has two sides: an app for customers who want a device repaired, collected, sold or
                bought, and an app for the mobile repair shops that provide those services. This
                policy is issued by {BRAND.company}, which is the controller of the personal
                information described here.
              </p>
              <p>
                Repair shops on {BRAND.name} are independent businesses. When you choose a shop, that
                shop becomes responsible for how it handles your device and the information it needs
                to service it. We provide the software both of you use.
              </p>
            </PolicySection>

            <PolicySection index={2} id={SECTIONS[1].id} title={SECTIONS[1].title}>
              <p>This policy applies to:</p>
              <ul>
                <li>
                  <strong>{BRAND.customerAppName}</strong> — the customer app with Home, Repair,
                  Sell, Buy and Profile tabs.
                </li>
                <li>
                  <strong>{BRAND.shopAppName}</strong> — the shop app used by shop owners,
                  technicians and pickup staff.
                </li>
                <li>
                  The {BRAND.name} web admin used by {BRAND.company} staff to onboard shops and
                  manage device master data.
                </li>
                <li>This website, {BRAND.website}.</li>
              </ul>
              <p>
                It does not cover what an individual repair shop does with information you give it
                directly outside the app — for example, a phone number you write on a paper job card
                at the counter.
              </p>
            </PolicySection>

            <PolicySection index={3} id={SECTIONS[2].id} title={SECTIONS[2].title}>
              <h3>Information you give us</h3>
              <ul>
                <li>
                  <strong>Account details</strong> — your name, mobile number and email address. Shop
                  owners additionally provide shop name, shop address, business contact numbers and
                  the KYC documents required to operate on the platform: Aadhaar, PAN, and either GST
                  or Udyam registration. Employees added by a shop may upload Aadhaar and PAN for
                  their own KYC record.
                </li>
                <li>
                  <strong>Addresses</strong> — the pickup and delivery addresses you save, including
                  district, taluk and PIN code, and a label such as Home or Work.
                </li>
                <li>
                  <strong>Device details</strong> — the category, brand, series, model, variant,
                  colour and storage you select. During shop intake a staff member may scan or enter
                  the <strong>IMEI</strong> or a device QR code, note missing parts, and record the
                  device <strong>PIN or pattern</strong> where the repair cannot be tested without
                  unlocking the handset.
                </li>
                <li>
                  <strong>Photos</strong> — images of the device you upload when requesting a sell
                  quotation, and images a technician captures as before-and-after evidence of a
                  repair.
                </li>
                <li>
                  <strong>Voice notes</strong> — the optional audio recording you can make to
                  describe the complaint. It is stored against that single repair ticket.
                </li>
                <li>
                  <strong>Answers you give in a flow</strong> — screening answers about a handset you
                  are selling (working or dead, screen condition, functional faults, accessories and
                  warranty status), and your approval or rejection of a repair estimate.
                </li>
                <li>
                  <strong>Chat messages</strong> — what you write to a shop, and what the shop writes
                  back, in the in-app chat.
                </li>
                <li>
                  <strong>Support requests</strong> — what you tell us when you call, message on
                  WhatsApp or email {BRAND.email}.
                </li>
              </ul>

              <h3>Information collected automatically</h3>
              <ul>
                <li>
                  <strong>Location</strong> — read from your device only when you grant permission
                  and only on screens that need it. See section 6.
                </li>
                <li>
                  <strong>Service records</strong> — bookings, ticket status changes and their
                  timestamps, pickup events, quotations, invoices and receipts generated as the work
                  moves through its stages.
                </li>
                <li>
                  <strong>Basic technical data</strong> — app version, platform and device type, plus
                  server logs and error reports needed to keep the service running and to diagnose
                  faults.
                </li>
                <li>
                  <strong>Push notification token</strong> — if you allow notifications, so we can
                  tell you when your booking status changes or a shop replies.
                </li>
              </ul>
              <p>
                We do not collect your contact list, your call logs, your SMS messages, your
                browsing history outside the app, or your payment card details.
              </p>
            </PolicySection>

            <PolicySection index={4} id={SECTIONS[3].id} title={SECTIONS[3].title}>
              <p>We use the information above to:</p>
              <ul>
                <li>Create and secure your account, and sign you in with a one-time passcode.</li>
                <li>
                  Show you repair services and prices that match your exact device model and variant.
                </li>
                <li>
                  Create a booking, route it to the shop you selected, schedule a doorstep pickup
                  slot and let a pickup agent reach your address.
                </li>
                <li>
                  Let you follow the ticket through its six stages — Service Accepted, Technician
                  Assigned, In Service Process, Work Completed, Out for Delivery and Delivered — and
                  see the full event history.
                </li>
                <li>
                  Send a repair estimate for your approval, and issue the service receipt and invoice
                  afterwards.
                </li>
                <li>
                  Circulate a sell request to nearby shops so several of them can quote, and let you
                  compare those quotations and pick one.
                </li>
                <li>Carry messages between you and a shop, and deliver order notifications.</li>
                <li>
                  Run the shop side of the platform: assigning technicians, recording staff
                  attendance and leave, generating payslips and reports, and managing inventory.
                </li>
                <li>
                  Verify a shop’s identity through KYC before it can take bookings, and manage its
                  subscription — the 15-day free trial and the Basic plan.
                </li>
                <li>
                  Answer support requests, investigate disputes about a device or a repair, prevent
                  fraud and abuse, and meet legal or tax obligations.
                </li>
                <li>
                  Improve the product — for example, fixing an error we see in server logs, or
                  understanding which flow is failing.
                </li>
              </ul>
            </PolicySection>

            <PolicySection index={5} id={SECTIONS[4].id} title={SECTIONS[4].title}>
              <h3>The shop you choose</h3>
              <p>
                {BRAND.name} is multi-tenant: each shop can see its own customers and its own tickets,
                and not another shop’s. When you book a repair or accept a quotation, the shop you
                selected receives what it needs to do the job — your name, mobile number, the pickup
                or delivery address, the device and its IMEI where recorded, your description of the
                fault including any photos or voice note, the unlock PIN or pattern if you provided
                one, and the chat thread and order history for that job.
              </p>
              <p>
                When you post a device for sale, nearby shops that can quote see the device details,
                your screening answers, the photos and your approximate area — so they can price it.
                Full contact and address details are shared with a shop once you accept its
                quotation.
              </p>
              <h3>Shop staff</h3>
              <p>
                Inside a shop, the owner and the technician assigned to your ticket can see the job.
                A pickup agent sees the pickup address and contact number for the collection they are
                assigned to.
              </p>
              <h3>Service providers</h3>
              <p>
                We use a small number of vendors to run the platform: cloud hosting and managed
                database services, an image and media hosting service for device photos and voice
                notes, an email delivery provider for one-time passcodes and notices, an SMS or push
                notification provider, and an IMEI lookup service used to identify a handset from its
                IMEI at intake. They process data on our instructions and only for those purposes.
              </p>
              <h3>Legal</h3>
              <p>
                We may disclose information where the law requires it, to respond to a valid request
                from a public authority, or to establish, exercise or defend a legal claim — for
                example a dispute over a device.
              </p>
              <p>
                <strong>We do not sell your personal information</strong>, and we do not share it
                with advertising networks or data brokers.
              </p>
            </PolicySection>

            <PolicySection index={6} id={SECTIONS[5].id} title={SECTIONS[5].title}>
              <p>
                The customer app asks for location permission for two reasons, and states them in
                exactly these words: we use your location to show pickup-enabled repair shops nearby
                and to set your default delivery address.
              </p>
              <ul>
                <li>
                  Shop discovery lists shops within roughly a <strong>20 km radius</strong> of the
                  point you are at, so you are not offered a shop that cannot collect from you.
                </li>
                <li>
                  Address entry uses your coordinates to pre-fill a new address so you do not have to
                  type it out. You can always edit or replace it.
                </li>
              </ul>
              <p>
                <strong>On this website</strong>, when you use the “Set location” control in the
                header, your coordinates are sent to BigDataCloud — a third-party geocoding service —
                for the sole purpose of turning them into a place name to display (for example
                “Cuddalore”). We send only the coordinates: no name, no device identifier and nothing
                that identifies you. Your coordinates are also stored in your own browser so the
                Near Shops page can sort shops by distance, and you can remove them at any time with
                the “Clear location” button in that same control. If you would rather not share the
                coordinates at all, simply do not use the control — every shop remains browsable
                without it.
              </p>
              <p>
                Location is requested at the moment a screen needs it. The customer app does not
                track your location in the background, and it does not build a movement history. If
                you decline the permission you can still use {BRAND.name} — you will need to search
                or enter an address manually instead. You can withdraw the permission at any time in
                your phone’s system settings.
              </p>
            </PolicySection>

            <PolicySection index={7} id={SECTIONS[6].id} title={SECTIONS[6].title}>
              <p>
                Camera and microphone access are requested only when you tap the control that uses
                them — adding a photo of a device, scanning an IMEI or QR code at shop intake, or
                recording a voice note about a fault. Nothing is captured before you press the
                button, and nothing is captured while the app is in the background.
              </p>
              <p>
                Photos and voice notes are uploaded to our media hosting provider and attached to the
                specific quotation or repair ticket they belong to. They are visible to you and to
                the shop handling that job, and to {BRAND.company} support staff only where needed to
                investigate a problem you have raised. IMEI numbers scanned at intake may be sent to
                an IMEI lookup service purely to identify the make and model of the handset.
              </p>
            </PolicySection>

            <PolicySection index={8} id={SECTIONS[7].id} title={SECTIONS[7].title}>
              <p>
                All three {BRAND.name} apps offer an <strong>App Lock</strong> that can be secured
                with your fingerprint, face, pattern or PIN.{' '}
                <strong>
                  Biometric data never leaves your device and is never sent to {BRAND.name}.
                </strong>{' '}
                The check is performed by your operating system against credentials stored in your
                phone’s own secure hardware; the app receives only a success or failure result. We
                cannot read, copy, store or share your fingerprint or face data, and neither can a
                shop.
              </p>
              <p>
                A device unlock <strong>PIN or pattern that you give a shop</strong> is different —
                that is information you deliberately hand over so a technician can test the repair.
                It is stored on the repair ticket and visible to the shop working on your device.
                Give it only when the repair requires it, and change it once your device is returned.
              </p>
            </PolicySection>

            <PolicySection index={9} id={SECTIONS[8].id} title={SECTIONS[8].title}>
              <p>
                You sign in with your mobile number or email. Authentication is either a password you
                set or a <strong>one-time passcode</strong> sent to your mobile or email address; the
                same OTP mechanism is used to reset a forgotten password. Passcodes are single-use
                and short-lived, and we log the fact that a code was requested so we can detect
                abuse.
              </p>
              <p>
                Once signed in, your app holds a session token so you stay signed in rather than
                logging in every time you open it. Sign out at any time from Profile or Settings,
                which discards that token on your device. If you believe someone else has access to
                your account, contact us on {BRAND.phone} and we will help you secure it.
              </p>
            </PolicySection>

            <PolicySection index={10} id={SECTIONS[9].id} title={SECTIONS[9].title}>
              <p>
                This section applies only to people employed by a shop that uses {BRAND.name}, not to
                customers.
              </p>
              <p>
                Shop employees clock in and out through the employee app. Because attendance is
                geofenced, the app records the coordinates and the distance from the shop at the
                exact moment of a check-in or check-out punch, together with the time. This is used
                to confirm the punch was made at the shop, to compute attendance, late hours, leave,
                permissions and salary reports, and to record pickup milestones such as reaching the
                customer’s location or arriving back at the shop.
              </p>
              <p>
                Only the punch events are recorded — the app does not follow an employee’s movements
                between punches. This data is visible to the employing shop owner and to the employee
                concerned. Employees with questions about how their shop uses attendance data should
                raise them with their employer in the first instance; we will assist where we can.
              </p>
            </PolicySection>

            <PolicySection index={11} id={SECTIONS[10].id} title={SECTIONS[10].title}>
              <p>We keep information only as long as there is a reason to:</p>
              <ul>
                <li>
                  <strong>Account details</strong> — while your account is active, and for a short
                  wind-down period after you ask us to close it.
                </li>
                <li>
                  <strong>Bookings, tickets, quotations and invoices</strong> — for as long as the
                  service record and any applicable warranty, accounting or tax obligation requires.
                  These records are the shop’s proof of what was done and your proof of what you
                  paid.
                </li>
                <li>
                  <strong>Device photos and voice notes</strong> — kept with the ticket or quotation
                  they belong to, and removed when that record is deleted.
                </li>
                <li>
                  <strong>Chat messages</strong> — retained so both you and the shop can refer back
                  to what was agreed.
                </li>
                <li>
                  <strong>Location captured for a pickup or an attendance punch</strong> — stored as
                  a single event on that booking or attendance record, not as an ongoing trail.
                </li>
                <li>
                  <strong>Server and error logs</strong> — kept for a limited operational period and
                  then rotated out.
                </li>
              </ul>
              <p>
                When a record no longer needs to identify you, we delete it or strip the identifying
                fields and keep only aggregate information.
              </p>
            </PolicySection>

            <PolicySection index={12} id={SECTIONS[11].id} title={SECTIONS[11].title}>
              <p>You can ask us to:</p>
              <ul>
                <li>
                  <strong>Access</strong> — tell you what personal information we hold about you.
                </li>
                <li>
                  <strong>Correct</strong> — fix anything inaccurate. Your name, mobile number, email
                  address, saved addresses and saved devices can be edited yourself from the Profile
                  tab.
                </li>
                <li>
                  <strong>Delete</strong> — close your account and delete your personal information,
                  subject to records we must keep for warranty, accounting or legal reasons.
                </li>
                <li>
                  <strong>Withdraw a permission</strong> — turn off location, camera, microphone or
                  notifications in your phone’s settings, or turn off App Lock in the app. Some
                  features stop working without them, but the rest of the app continues to work.
                </li>
                <li>
                  <strong>Object or complain</strong> — raise a concern about how your information
                  has been handled.
                </li>
              </ul>
              <p>
                Send any of these requests to <a href={BRAND.emailHref}>{BRAND.email}</a> from the
                email address or mobile number on your account, or call {BRAND.phone}. We may need to
                verify your identity before acting, and we will respond within a reasonable period.
              </p>
              <p>
                If your request concerns information held by a particular shop about a repair it
                carried out, tell us which shop and we will pass the request on and follow up.
              </p>
            </PolicySection>

            <PolicySection index={13} id={SECTIONS[12].id} title={SECTIONS[12].title}>
              <p>
                {BRAND.name} is not intended for children. Accounts are for people aged 18 and over,
                and shop and employee accounts are for people legally able to work. We do not
                knowingly collect personal information from a child. If you believe a child has
                created an account or given us information, contact{' '}
                <a href={BRAND.emailHref}>{BRAND.email}</a> and we will delete it.
              </p>
            </PolicySection>

            <PolicySection index={14} id={SECTIONS[13].id} title={SECTIONS[13].title}>
              <p>
                We take security seriously and apply protections appropriate to the sensitivity of
                the data:
              </p>
              <ul>
                <li>Traffic between the apps and our servers is encrypted in transit.</li>
                <li>
                  Access is token-based, and the platform is multi-tenant by design — a shop can only
                  read its own customers, tickets and staff.
                </li>
                <li>
                  Passwords are stored hashed, never in plain text, and one-time passcodes expire
                  after a short window.
                </li>
                <li>
                  Media such as device photos and voice notes is held with a specialist hosting
                  provider rather than on general-purpose storage.
                </li>
                <li>
                  Administrative access inside {BRAND.company} is limited to the staff who need it to
                  operate and support the platform.
                </li>
                <li>App Lock adds a further on-device barrier if your phone is lost or shared.</li>
              </ul>
              <p>
                No system is perfectly secure, and we do not claim otherwise. We make no
                certification claims. If we become aware of a breach affecting your personal
                information, we will notify affected users and act to contain it. Help us by keeping
                your OTP to yourself — {BRAND.name} staff will never ask you for a one-time passcode.
              </p>
            </PolicySection>

            <PolicySection index={15} id={SECTIONS[14].id} title={SECTIONS[14].title}>
              <p>
                As {BRAND.name} adds features, this policy will change. The current version is always
                published on this page with the last-updated date at the top. If a change materially
                affects how we use your information, we will give notice in the app before it takes
                effect. Continuing to use {BRAND.name} after a change means you accept the updated
                policy.
              </p>
              <p>
                <strong>Last updated: {LEGAL_UPDATED}.</strong>
              </p>
            </PolicySection>

            <PolicySection index={16} id={SECTIONS[15].id} title={SECTIONS[15].title}>
              <p>
                Questions about this policy, or about the information we hold about you, go to{' '}
                {BRAND.company}:
              </p>
              <ul>
                <li>
                  Email <a href={BRAND.emailHref}>{BRAND.email}</a>
                </li>
                <li>
                  Phone or WhatsApp <a href={BRAND.phoneHref}>{BRAND.phone}</a>
                </li>
                <li>
                  Website{' '}
                  <a href={BRAND.websiteUrl} target="_blank" rel="noopener noreferrer">
                    {BRAND.website}
                  </a>
                </li>
              </ul>
              <p>
                Please mention whether you are writing as a customer, a shop owner or a shop employee
                — it helps us find your records faster.
              </p>
            </PolicySection>
          </Prose>
        </div>
      </Section>

      {/* Contact channels --------------------------------------------------- */}
      <Section tone="white">
        <SectionHeading
          eyebrow="Privacy requests"
          title="Talk to a human about your data"
          subtitle="Access, correction and deletion requests are handled by the same support team that handles orders — reach them however suits you."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {SUPPORT_CHANNELS.map((channel) => {
            const Icon = resolveIcon(channel.icon) || Mail;
            return (
              <Card key={channel.key} className="h-full text-center">
                <span
                  className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-600"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-bold text-brand-ink">{channel.label}</h3>
                <a
                  href={channel.href}
                  className="mt-2 inline-block break-words text-sm font-medium text-brand-700 underline underline-offset-2 transition hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 sm:text-base"
                >
                  {channel.value}
                </a>
              </Card>
            );
          })}
        </div>

        <div className="mt-14">
          <CTABand
            title="Clear about your data. Clear about your device."
            subtitle="Read the Terms of Service for how bookings, estimates, quotations and subscriptions work — or just ask us."
            primary={CTA.contact}
            secondary={{ label: 'Terms of Service', href: '/terms' }}
          />
        </div>
      </Section>
    </>
  );
}
