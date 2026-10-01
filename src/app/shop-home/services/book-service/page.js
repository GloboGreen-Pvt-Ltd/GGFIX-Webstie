'use client';

/**
 * /shop-home/services/book-service — "Book Service" (Create Booking).
 *
 * 2026-09: several rounds of UI-only redesign — every field, handler,
 * validation rule, and API call below is byte-for-byte the same logic this
 * page has always had.
 *   - Compact multi-column grids instead of one full-width column per
 *     section.
 *   - Reorganized into 4 content groups (Customer/Device/Problem & Service/
 *     Pickup), now shown as a horizontal tab bar with Previous/Next/Confirm
 *     Booking in a sticky step footer — only the active tab's fields render.
 *   - Brand and Model are now an image-aware searchable picker
 *     (`ImageSelect`, below) instead of a plain `<select>`: `Brand.imageUrl`/
 *     `Model.imageUrl` are real master-data fields (confirmed via the admin
 *     brands/models pages, which already upload and render them) — this
 *     just surfaces them here too, with a small selected-device preview
 *     once both are picked. `onChange` still writes the exact same
 *     `brandId`/`brandName`/`modelId`/`modelName` (+ resets) the old
 *     `<select>`'s handler did.
 * The shared CardShell/StatCard/etc. components used by every OTHER page
 * are deliberately untouched — this file still uses its own local
 * `Section`/`COMPACT_INPUT_CLS` rather than the shared ones: the brief
 * scoped these redesigns to Book Service, not a global change across the
 * whole dashboard.
 *
 * The 4 tab groups don't have a 1:1 slot for every existing field — Device
 * Photos and the itemized Pricing inputs (inspection/service/parts/pickup
 * charge, discount, tax) aren't named in any of the 4 groups, but they're
 * real, existing fields that can't just disappear. Photos live at the end
 * of Device Details (they document the device); the itemized pricing
 * inputs live at the end of Problem & Service Details, ending in the
 * Estimated Total. "Pickup Required" (asked for once) isn't a real field —
 * the existing Service Method select (Walk-in/Pickup/Doorstep) already
 * serves that purpose and is used as-is.
 *
 * Device category/brand/model and repair-category/service lookups reuse the
 * exact masterApi calls the public /repair flow uses (RepairFlow.js).
 *
 * Service Method and Preferred Date/Time (and their getPickupSlots lookup)
 * were removed entirely per request — every booking now submits as
 * Walk-in (form.serviceMode's EMPTY_FORM default, never changed by any UI
 * anymore) with an empty pickupDate/pickupSlotStart/pickupSlotEnd.
 * validate() no longer requires a slot; the confirmation screen hides its
 * "Scheduled" row when there isn't one. needsAddress (`serviceMode !==
 * 'WALK_IN'`) is consequently always false now, so the Address card on
 * Customer Details is never required — it's kept as-is regardless, in
 * case a future change reintroduces a non-Walk-in service mode.
 *
 * Submission is a stub — see src/lib/shopBooking.js's doc comment for why
 * (no shop-authenticated booking-creation endpoint exists yet). Photo
 * upload and master-data lookups are real, live calls.
 *
 * Device Category also uses `ImageSelect` now (categories carry a real
 * `imageUrl` too — confirmed via the admin Device Categories page, same
 * `/master/device-categories` list this page already fetches). Color has no
 * image field at all — a model's colors are plain strings, not objects — so
 * it gets a swatch instead, via `guessColorHex()` (src/lib/colorSwatch.js,
 * the exact same color-name→hex algorithm the admin Models page already
 * uses to preview colors, extracted so both stay in agreement). RAM/Storage
 * is left as a plain select: it's a spec string ("8GB + 128GB"), there's no
 * image or color concept that honestly applies to it.
 *
 * Color is its own full-width row below Model/IMEI now, showing every
 * available color as an always-visible swatch+name chip (same chip style
 * Problem & Service Details' Service Type already uses) instead of a closed
 * dropdown — replaced the earlier `ColorSelect` combobox, which is now
 * deleted rather than left as dead code. A model with exactly one color
 * auto-selects it (nothing to choose); zero colors shows "No colors
 * available" instead of hiding the section, so that state is honest rather
 * than looking like the section is just missing.
 *
 * `colorSwatch.js` is dynamically `import()`ed, not a static top-of-file
 * import — it pulls in a ~32k-entry color-name dataset, which measured as a
 * +300KB jump in this page's first-load JS when imported statically. It's
 * only actually needed once a selected model has colors to show, so it's
 * fetched as its own lazy chunk at that point instead of bloating every
 * visit to this page (including bookings for models with no color list).
 *
 * Customer Name has a "previous customers" type-ahead now. There is no
 * customer-search-by-name endpoint anywhere reachable from a shop-owner
 * session (confirmed by a full-tree investigation — every customer-shaped
 * path that exists is a customer *self-service* endpoint, keyed to the
 * customer's own bearer token, not the shop's). So this searches the same
 * derived "customers who've booked with this shop before" directory the
 * Customers page already builds from GET {ORDER_BASE}/repair-bookings/shop
 * (shared via src/lib/customerDirectory.js so both pages agree), not a real
 * backend directory — and there is no ID-proof/KYC field on any customer
 * data this client can reach, so no such preview is shown; inventing one
 * would be fabricating data. Picking a match fills name/phone/email and, if
 * that customer's most recent booking had a pickup address, the address
 * fields too — all still freely editable afterward.
 *
 * The address fields (Address Line/Landmark/Pincode/City/District/State)
 * now render as their own "Address" card on the Customer Details tab
 * instead of inside Pickup / Service Location — same 6 real fields, same
 * `needsAddress`-gated required-ness, just relocated per request so address
 * is captured earlier in the flow. No `Taluk`/`Area` field was added even
 * though a reference design showed one — this booking's `pickupAddress`
 * payload shape has no such field (a *different* address model,
 * `{USER_BASE}/customer/addresses`, does have `taluk`/`area`, but that's
 * the customer's own self-service address book, not this booking's
 * pickup-address shape, and adding fields to a real payload the backend
 * wasn't built to receive isn't a layout change).
 *
 * Category/Brand/Model each now track their own loading/error state
 * instead of the fetch's failure being silently swallowed into an empty
 * array (`.catch(() => setX([]))`, the previous behavior for all three).
 * That mattered in practice: this environment's `MASTER_BASE()` host
 * (`api.ggfix.in`, from .env.local) was unreachable when this was written —
 * confirmed by a direct request from this environment timing out while
 * general internet access worked fine — so every one of these dropdowns
 * was silently empty with no indication anything had failed. A genuinely
 * unreachable backend can't be fixed from this file (no frontend change
 * makes an unresponsive server respond), but the dropdowns now say so
 * plainly and offer Retry instead of just looking broken/empty.
 *
 * The 3rd tab (formerly "Problem & Service Details") is now "Add Issue /
 * Service" — a UI-only redesign of the same real relevantRepairCategories/
 * repairServices/form.serviceIds/toggleService this page already had. It
 * used to be a "Service Category" select + a flat "Service Type" chip
 * list; it's now one always-visible accordion row per real repair category
 * (IssueCategoryRow, below), each expanding to that category's real
 * services as Add/Remove rows, plus a removable "Selected Services"
 * summary. Device Condition, Problem Description and Pricing used to live
 * on this same tab (back when it was "Problem & Service Details") — they
 * now live on the 4th tab, Pickup / Service Location, so this tab is only
 * ever the repair-category picker; same fields/validation/estimateTotal(),
 * just relocated. No new category/service data, no new submission field —
 * same serviceIds this page always collected. Per-category icons are
 * guessed from each
 * category's real name via iconForRepairCategory() (same idea as
 * guessColorHex() in colorSwatch.js: derive a visual from real text, not a
 * fixed per-category table), so it works for whatever repair categories
 * the backend actually returns. "Device-aware" filtering already existed
 * before this change — relevantRepairCategories already filters by the
 * selected device category's `deviceCategoryId` (picked on the Device
 * Details tab), so this accordion inherits it for free; if no device
 * category is picked yet, it says so instead of showing an empty list. The
 * old "Service Category" select field (form.serviceCategoryId) is no
 * longer shown anywhere (still present in form state, just unused, so
 * nothing about the payload shape changes).
 *
 * Each selected service also gets a Price input + Warranty (3/6/12
 * months) chip row — repair-services has no price/warranty field anywhere
 * in this backend, and the booking payload's `services` array only ever
 * carries repairServiceId/serviceCode/serviceName (RepairFlow.js,
 * repairBooking.js, and every bookings/pickups list view agree on that
 * shape) — there's no per-item price/warranty line to submit into. Price
 * is still made real the only honest way available: every entered price
 * is summed (draftServicesSubtotal) and synced into the page's actual,
 * submitted `form.serviceCharge` field via an effect, so it genuinely
 * reaches the real Estimated Total — the standalone manual Pricing card
 * (Inspection/Service/Parts/Pickup Charge, Discount, Tax) was removed from
 * the Pickup tab so Service Charge is only ever set this way now (those
 * other charge fields stay in form state, just with no UI to edit them —
 * same "kept but unused" treatment as form.serviceCategoryId elsewhere in
 * this file). Warranty has no equivalent field to feed at all, so it
 * stays a pure local note, never submitted. A "Last 5 prices" control was
 * requested too but left out entirely: there's no per-service price
 * history anywhere to show, not even approximately (ticket priceItemsJson
 * has no repairServiceId to join on and isn't reachable from a
 * booking-shaped page anyway), so there was no honest way to build it.
 *
 * The 4th tab, "Service Price & Issue Estimate" (was "Pickup / Service
 * Location", then "Problem & Service Details" further back), settled on
 * these cards after several rounds of trimming/reorganizing per request:
 *   - Bill Details — an itemized view of chosenServices/
 *     draftServicePrices/toggleService, an "Add Service" shortcut that
 *     jumps to the 3rd tab, and the real Estimated Total banner
 *     (totals.total, driven entirely by the summed service prices).
 *   - Device IMEI / Serial Number — the same real form.imei field also on
 *     Device Details, shown again here since this is the estimate step.
 *   - Estimated Delivery — a local-only planning aid, a "Ready By"
 *     date+time picked via a real month calendar + Hour/Minute/AM-PM
 *     selects (ReadyByPicker, below — a later request replaced this
 *     card's original Received/Duration/Ready By three-tile layout with
 *     this single widget, modeled on a reference design). Never submitted.
 * Device Photos (front/back/damage/additional, with the shop-token upload
 * to media storage) used to be a 4th card on this tab — removed entirely
 * per request, along with its `photos`/`photoUploading`/`photoError`
 * state, `pickPhoto`/`removePhoto`/`pickAdditionalPhoto`/
 * `removeAdditionalPhoto` handlers, the `PhotoTile` component, and the
 * `frontImageUrl`/`backImageUrl`/`damageImageUrl`/`additionalImageUrls`
 * payload fields — none of that is submitted with a booking anymore.
 * `uploadShopDevicePhoto` itself is untouched in src/lib/shopBooking.js in
 * case a future page needs it again.
 *
 * Modeled on a reference "Service Price & Issue Estimate" screen, but
 * four of its elements were never built after investigation confirmed
 * they have no real backing anywhere in this app: an on-time/SLA status
 * (no turnaround or promised-date field exists on any booking/ticket), a
 * "customer approved the estimate" checkbox (no consent/approval flag
 * exists), an IMEI camera Scan button, and Record Voice Note (no
 * scanning or audio-recording capability integrated anywhere, and no
 * field to submit a recording into even if captured). An "Issue Details"
 * card (Device Condition + Problem Description) briefly lived on this tab
 * too but was removed per request — those two fields currently have no
 * dedicated UI anywhere (Problem Description is still reachable
 * incidentally through the "Other" repair category's textarea on the 3rd
 * tab, if that category exists).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleEllipsis,
  ClipboardList,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Droplet,
  Eye,
  EyeOff,
  Fingerprint,
  Grid3x3,
  Hash,
  History,
  Home,
  Info,
  KeyRound,
  Landmark,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Mic,
  Minus,
  Music2,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  QrCode,
  Receipt,
  RectangleHorizontal,
  RotateCcw,
  ScanLine,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Square,
  Tag,
  Terminal,
  Timer,
  Trash2,
  Truck,
  Usb,
  User,
  UserCog,
  Volume2,
  Wifi,
  Wrench,
  X,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import { masterApi } from '@/lib/api';
import { fetchShopBookings } from '@/lib/shopDashboard';
import { deriveCustomers } from '@/lib/customerDirectory';
import { fetchMyProfile } from '@/lib/shopProfile';
import { createShopBooking, estimateTotal, uploadShopDevicePhoto } from '@/lib/shopBooking';
import { required, validateForm } from '@/lib/formValidation';
import { focusField, registerField } from '@/lib/formFocus';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';
// Page-local, compact tokens — see file header for why these aren't the
// shared FIELD_INPUT_CLS/CardShell used elsewhere in the dashboard.
const COMPACT_INPUT_CLS =
  'w-full rounded-xl border border-[#DFE9E5] bg-[#F8FBFA] px-3.5 py-3 text-sm text-[#10213D] placeholder:text-[#98A2B3] transition focus:border-[#0A8F4B] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#DCFCE7] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#98A2B3]';
// Same box, with room carved out on the left for a leading icon (see
// IconField, below) — used wherever a field shows one, so the input text
// never sits underneath the icon.
const ICON_INPUT_CLS = cx(COMPACT_INPUT_CLS, 'pl-10');

// Per-service Price/Warranty in "Add Issue / Service" (below) — neither has
// a field on repair-services or the booking payload's `services` array
// (confirmed investigation: that array only ever carries repairServiceId/
// serviceCode/serviceName). Price is still made *real* the only honest way
// available: every entered price is summed into the page's existing, real
// `form.serviceCharge` field (see the effect syncing it from
// draftServicesSubtotal, below), so it genuinely reaches the submitted
// Estimated Total — just not as a separate per-item line, since no such
// line exists in the payload. Warranty has no equivalent real field to
// feed at all, so it stays a pure local scratchpad note.
const WARRANTY_OPTIONS = ['3', '6', '12'];

// This array's own order IS the tab bar's display order AND drives
// goPrev/goNext and each button's step-number badge (i + 1 in
// the tab bar below). devicesList and confirmation are appended at the end
// per request — 1 through 7 keep their existing order/position untouched.
// confirmation being the new last entry means the shared step footer's
// "Confirm Booking" now sits one tab before it, on devicesList, right next
// to that section's own "Submit Booking" bar (both call the same submit());
// submit() itself navigates to 'confirmation' on success (see submit(),
// below) rather than the user tapping through to it manually.
// `subtitle` is a page-local, purely-cosmetic addition to each existing tab
// (used only by the redesigned step-progress bar below) — labels, icons,
// keys, order and everything the tab bar's click handlers/validation key
// off of are unchanged.
const SECTIONS = [
  { key: 'customer', label: 'Customer Details', subtitle: 'Add customer information', icon: User },
  { key: 'device', label: 'Device Details', subtitle: 'Add device information', icon: Smartphone },
  { key: 'problem', label: 'Add Issue / Service', subtitle: 'Select issue and service', icon: Wrench },
  { key: 'pickup', label: 'Service Price & Issue Estimate', subtitle: 'Review and estimate', icon: Receipt },
  { key: 'deviceInfo', label: 'Device Information', subtitle: 'Device details and photos', icon: Info },
  { key: 'deviceSecurity', label: 'Device Security Lock', subtitle: 'Screen lock details', icon: Lock },
  { key: 'missingParts', label: 'Device Missing Parts', subtitle: 'Inspection checklist', icon: ListChecks },
  { key: 'devicesList', label: 'Service Booking Devices List', subtitle: 'Review and submit', icon: ClipboardList },
  { key: 'confirmation', label: 'Booking Confirmation', subtitle: 'Booking created', icon: CheckCircle2 },
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Pay Later', 'Other'];

// Device Missing Parts inspection checklist. missingDamageParts (the
// summary string built from this, below) is the REAL booking field this
// codebase already reads elsewhere (OrdersExperience.js: "Missing or
// damaged parts" · falls back to "Nil") — not a new, parallel field. The
// per-part missing/damaged breakdown itself has no structured backend
// field to store into, so it stays local UI state and is only ever
// submitted as that one joined summary string.
const MISSING_PART_ITEMS = [
  { key: 'display', icon: Smartphone, title: 'Display', subtitle: 'Screen and front panel' },
  { key: 'backPanel', icon: RectangleHorizontal, title: 'Back Panel', subtitle: 'Rear cover and housing' },
  { key: 'simCardTray', icon: CreditCard, title: 'SIM Card Tray', subtitle: 'SIM card holder' },
  { key: 'buttons', icon: SlidersHorizontal, title: 'Buttons', subtitle: 'Power, volume and other buttons' },
  { key: 'chargingPort', icon: Usb, title: 'Charging Port', subtitle: 'USB port and connectors' },
  { key: 'camera', icon: Camera, title: 'Camera', subtitle: 'Front and rear camera modules' },
  { key: 'speaker', icon: Volume2, title: 'Speaker', subtitle: 'Speaker and audio output' },
];

// Device Security Lock's selectable lock types. 'PIN'/'Password'/'Pattern'
// map directly to the REAL booking.deviceSecurityType field this codebase
// already reads elsewhere (Receipt/QR E-Print pages, the customer app's
// OrdersExperience.js) — not a new, parallel field. 'NONE' (No Lock) is
// its own explicit value, deliberately DIFFERENT from form.deviceSecurityType's
// unselected default of '' — collapsing "nothing chosen yet" and "No Lock
// chosen" onto the same '' was the bug that made No Lock look pre-selected
// on page load and made "you must pick something" validation impossible to
// express. 'NONE' is translated back to no value (undefined) only at
// submit time, so the payload still matches this field's existing
// "no value" convention everywhere else it's read.
const LOCK_OPTIONS = [
  { key: 'PIN', icon: Hash, title: 'Numeric PIN', subtitle: '4–6 digit device PIN', example: 'e.g. 1234 · 987654' },
  { key: 'Password', icon: KeyRound, title: 'Password', subtitle: '4–16 letters & numbers', example: 'e.g. Ggfix2026' },
  { key: 'Pattern', icon: Grid3x3, title: 'Pattern Lock', subtitle: 'Draw across at least 4 dots' },
  { key: 'NONE', icon: ShieldCheck, title: 'No Lock', subtitle: 'Device is already unlocked', badge: 'Ready for Service' },
];

const EMPTY_FORM = {
  customerName: '',
  customerMobile: '',
  customerAltMobile: '',
  customerEmail: '',
  categoryCode: '',
  categoryId: '',
  brandId: '',
  brandName: '',
  modelId: '',
  modelName: '',
  color: '',
  variant: '',
  imei: '',
  deviceSecurityType: '',
  devicePin: '',
  serviceCategoryId: '',
  serviceIds: [],
  issueDescription: '',
  deviceCondition: '',
  frontImageUrl: '',
  backImageUrl: '',
  damageImageUrl: '',
  additionalImageUrls: [],
  serviceMode: 'WALK_IN',
  addressLine: '',
  landmark: '',
  pincode: '',
  city: '',
  district: '',
  state: '',
  pickupDate: '',
  pickupSlotStart: '',
  pickupSlotEnd: '',
  inspectionCharge: '',
  serviceCharge: '',
  partsCharge: '',
  pickupCharge: '',
  discount: '',
  taxPercent: '',
};

function unwrap(list) {
  if (Array.isArray(list)) return list;
  return list?.content ?? list?.data ?? [];
}

/** Clean, de-duplicated list of non-empty strings from a possibly-messy jsonb value. */
function cleanList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  value.forEach((v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  });
  return out;
}

function money(n) {
  return `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Best-guess icon for a repair category, from its real name/displayName —
 * same idea as guessColorHex() in src/lib/colorSwatch.js (derive a visual
 * from real text instead of a hand-maintained per-category table), so it
 * works for whatever repair categories the backend actually has, not a
 * fixed list. Falls back to the generic Wrench icon for anything that
 * doesn't match a keyword.
 */
function iconForRepairCategory(name) {
  const n = String(name || '').toLowerCase();
  const rules = [
    [/screen|display|glass|touch|lcd|pixel/, Smartphone],
    [/batter|power\b/, BatteryCharging],
    [/charg|usb|port/, Usb],
    [/audio|speaker|mic|earpiece|sound|volume/, Volume2],
    [/camera|lens/, Camera],
    [/button|sensor|fingerprint|face|proximity/, Fingerprint],
    [/network|wi-?fi|bluetooth|signal|sim|gps|cellular/, Wifi],
    [/motherboard|hardware|\bic\b|circuit|board/, Cpu],
    [/software|operating system|\bos\b|boot|app|hang|slow/, Terminal],
    [/water|physical|frame|body|clean/, Droplet],
    [/storage|\bdata\b|memory/, Database],
    [/other|misc/, CircleEllipsis],
  ];
  const hit = rules.find(([re]) => re.test(n));
  return hit ? hit[1] : Wrench;
}

/**
 * Per-section required-field schemas — same fields/messages validate()
 * always checked, just structured per tab so both goNext() (gate the
 * current step) and the final submit (gate everything) can reuse the exact
 * same rules instead of two hand-written copies. `values` passed to
 * validateForm() below is always `{ ...form, needsAddress }` since
 * `needsAddress` is a derived local, not a form field.
 */
const SECTION_VALIDATORS = {
  customer: {
    customerName: required('Customer name is required.'),
    customerMobile: required('Customer mobile number is required.'),
  },
  device: {
    categoryId: required('Select the device category, brand and model.'),
    brandId: required('Select the device category, brand and model.'),
    modelId: required('Select the device category, brand and model.'),
  },
  problem: {
    issueDescription: (value, all) =>
      (all.serviceIds || []).length === 0 && !String(value || '').trim()
        ? 'Select at least one service type or describe the problem.'
        : '',
  },
  pickup: {
    addressLine: (value, all) => (all.needsAddress && !String(value || '').trim() ? 'Fill in the pickup address.' : ''),
    pincode: (value, all) => (all.needsAddress && !String(value || '').trim() ? 'Fill in the pickup address.' : ''),
    city: (value, all) => (all.needsAddress && !String(value || '').trim() ? 'Fill in the pickup address.' : ''),
    state: (value, all) => (all.needsAddress && !String(value || '').trim() ? 'Fill in the pickup address.' : ''),
  },
  deviceSecurity: {
    deviceSecurityType: required('Please select the device security type.'),
    devicePin: (value, all) => {
      const v = String(value || '');
      if (all.deviceSecurityType === 'PIN' && !/^\d{4,6}$/.test(v)) return 'PIN must contain at least 4 digits.';
      if (all.deviceSecurityType === 'Password' && (v.length < 4 || v.length > 16)) return 'Password must be 4–16 characters.';
      if (all.deviceSecurityType === 'Pattern' && v.split('-').filter(Boolean).length < 4) return 'Pattern must connect at least 4 dots.';
      return '';
    },
  },
  // deviceInfo/missingParts/devicesList intentionally have no required
  // fields here — color/variant, missing-parts flags, and the review list
  // are optional by the existing backend contract (missingDamageParts
  // already defaults to "Nil" when nothing is flagged).
};

/** Which tab a given field belongs to, so a failed goNext()/submit can jump the user straight there. */
function sectionForField(field) {
  const entry = Object.entries(SECTION_VALIDATORS).find(([, schema]) => field in schema);
  return entry ? entry[0] : null;
}

/**
 * BookServiceIllustration — small decorative device+repair-tools graphic for
 * the hero's right side (phone, wrench, gears), matching a reference
 * design's "3D mobile phone + wrench + gear" corner illustration. Hand-drawn
 * inline SVG, purely decorative — no data, same treatment as the Partner
 * Dashboard's own ShopIllustration (src/app/shop-home/page.js).
 */
function BookServiceIllustration() {
  return (
    <svg viewBox="0 0 220 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bsGear1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id="bsGear2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6EE7B7" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="185" cy="40" r="16" fill="#BFE8FF" opacity="0.6" />
      <circle cx="205" cy="70" r="10" fill="#BFE8FF" opacity="0.5" />

      {/* gears */}
      <g fill="url(#bsGear1)">
        <circle cx="168" cy="55" r="20" />
        <circle cx="168" cy="55" r="7" fill="white" opacity="0.9" />
      </g>
      <g fill="url(#bsGear2)">
        <circle cx="130" cy="95" r="16" />
        <circle cx="130" cy="95" r="5.5" fill="white" opacity="0.9" />
      </g>

      {/* phone */}
      <g>
        <rect x="150" y="80" width="46" height="66" rx="9" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="157" y="88" width="32" height="46" rx="3" fill="#EAF5FF" />
        <circle cx="173" cy="139" r="2.4" fill="#DCFCE7" />
      </g>

      {/* wrench, laid across the phone */}
      <g transform="translate(140,118) rotate(-28)">
        <rect x="0" y="0" width="46" height="8" rx="4" fill="#15803D" />
        <circle cx="0" cy="4" r="8" fill="none" stroke="#15803D" strokeWidth="6" />
      </g>

      {/* floating dots/diamonds */}
      <circle cx="112" cy="40" r="4" fill="#86EFAC" />
      <rect x="94" y="66" width="7" height="7" transform="rotate(45 97.5 69.5)" fill="#86EFAC" opacity="0.8" />
    </svg>
  );
}

function Section({ title, subtitle, icon: Icon, children, className }) {
  return (
    <section
      className={cx(
        'relative overflow-hidden rounded-[22px] border border-[#E4EFEB] bg-white/95 p-5 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)]',
        className,
      )}
    >
      <span className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#E4F8EC] blur-2xl" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-6 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[#EAF5FF] blur-2xl" aria-hidden="true" />
      {title ? (
        <div className="relative mb-4 flex items-center gap-3">
          {Icon ? <Icon3D icon={Icon} tone="green" size="md" /> : null}
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-[#10213D]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-[#6B7890]">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}

/** Field wrapper adding a leading icon inside a COMPACT/ICON_INPUT_CLS box — visual only, the wrapped input's value/onChange/validation are untouched. */
function IconField({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A8F4B]" aria-hidden="true" />
      {children}
    </div>
  );
}

function FormField({ label, required, error, fieldRef, className, children }) {
  return (
    <div ref={fieldRef} className={className}>
      <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-[#667085]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * Customer Name input with a "previous customers" type-ahead — see the file
 * header comment for what `directory` actually is (derived from this shop's
 * own booking history, not a real backend search) and its limits. Typing
 * always still just edits the plain text value like a normal input; the
 * dropdown is purely an optional shortcut, never required.
 */
function CustomerNameField({ value, onChangeText, directory, onPick }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = value.trim().toLowerCase();
  const matches = q.length >= 2 ? directory.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 6) : [];

  return (
    <div ref={wrapRef} className="relative">
      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A8F4B]" aria-hidden="true" />
      <input
        className={ICON_INPUT_CLS}
        value={value}
        onChange={(e) => {
          onChangeText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Full name"
        autoComplete="off"
      />
      {open && matches.length > 0 ? (
        <div className="absolute left-0 top-[calc(100%+0.25rem)] z-30 w-full min-w-[260px] rounded-xl border border-[#EAECF0] bg-white p-1.5 shadow-[0_12px_28px_rgba(16,24,40,0.12)]">
          <p className="px-2 pb-1 pt-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Previous customers</p>
          {matches.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onPick(c);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-[#F0FDF4]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[10px] font-bold text-[#15803D]">
                {initials(c.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[#101828]">{c.name}</span>
                <span className="block truncate text-xs text-[#667085]">
                  {c.phone || 'No phone'} · {c.totalBookings} booking{c.totalBookings === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function addressFieldsFrom(booking) {
  const a = booking?.pickupAddress;
  if (!a) return null;
  return {
    addressLine: a.addressLine || '',
    landmark: a.landmark || '',
    pincode: a.pincode || '',
    city: a.city || '',
    district: a.district || '',
    state: a.state || '',
  };
}

function Thumb({ url, name, size = 'h-7 w-7' }) {
  return url ? (
    <span className={cx('shrink-0 overflow-hidden rounded-lg border border-[#EAECF0] bg-white', size)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- master-data brand/model images, remote S3 URLs. */}
      <img src={url} alt="" className="h-full w-full object-contain" />
    </span>
  ) : (
    <span className={cx('flex shrink-0 items-center justify-center rounded-lg border border-[#EAECF0] bg-[#F0FDF4] text-[10px] font-bold text-[#15803D]', size)}>
      {initials(name)}
    </span>
  );
}

/**
 * Searchable image-aware picker — used for Device Category/Brand/Model.
 * `options` is the exact array already fetched for the plain `<select>`
 * this replaced (`{id, name, imageUrl, ...}`); `onChange` receives the
 * whole selected option object (or null when cleared), same as a
 * `<select>`'s handler would derive from `options.find(o => o.id ===
 * e.target.value)`.
 *
 * Root-caused bug: Category/Brand/Model all live inside the Device Details
 * `Section`, which (like every other Section on this page) has
 * `overflow-hidden` on its own outer box — needed there to clip its two
 * decorative corner glows to the card's rounded edge. This open panel used
 * to be a plain `absolute` child of that same box, so it rendered fine but
 * was then invisibly clipped by that ancestor's overflow-hidden the moment
 * it extended past the card's bottom edge — the actual API data (verified
 * live: categories/brands/models all return correctly, real imageUrl
 * included) was never the problem; the popped-open list was just cut off
 * to near-nothing. Portaling the open panel to document.body — fixed-
 * positioned from the trigger's own real on-screen rect, recomputed on
 * open/scroll/resize — escapes that ancestor entirely without touching
 * Section itself (so its glow-clipping stays intact for every other tab on
 * this page). */
function ImageSelect({ label, required, value, options, onChange, placeholder, loading, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const selected = options.find((o) => o.id === value) || null;

  const updateRect = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  };

  useEffect(() => {
    if (!open) return undefined;
    updateRect();
    function onDown(event) {
      const inTrigger = wrapRef.current && wrapRef.current.contains(event.target);
      const inPanel = panelRef.current && panelRef.current.contains(event.target);
      if (!inTrigger && !inPanel) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateRect closes over refs only, stable across renders.
  }, [open]);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => (o.name || '').toLowerCase().includes(q)) : options;
  const emptyMessage = options.length === 0 ? `No ${label.toLowerCase()} available` : 'No matches';

  const panel =
    open && rect && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width }}
            className="z-[100] min-w-[260px] rounded-xl border border-[#EAECF0] bg-white p-2 shadow-[0_12px_28px_rgba(16,24,40,0.12)]"
          >
            <div className="relative mb-1.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" aria-hidden="true" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- picker just opened via explicit click, focusing its own search field is expected. */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full rounded-lg border border-[#D0D5DD] bg-white py-1.5 pl-8 pr-2.5 text-sm text-[#101828] outline-none focus:border-[#15803D]"
              />
            </div>
            <div role="listbox" className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-[#98A2B3]">{emptyMessage}</p>
              ) : (
                filtered.map((o) => {
                  const isSel = o.id === value;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => {
                        onChange(o);
                        setOpen(false);
                      }}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition',
                        isSel ? 'bg-[#F0FDF4] text-[#15803D]' : 'text-[#344054] hover:bg-[#F9FAFB]',
                      )}
                    >
                      <Thumb url={o.imageUrl} name={o.name} />
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                      {isSel ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-[#667085]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <button
        ref={btnRef}
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'flex w-full items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-left text-sm transition',
          FOCUS_RING,
          disabled ? 'cursor-not-allowed bg-[#F9FAFB] text-[#98A2B3]' : 'hover:border-[#86EFAC]',
        )}
      >
        {selected ? <Thumb url={selected.imageUrl} name={selected.name} /> : null}
        <span className={cx('min-w-0 flex-1 truncate', selected ? 'font-medium text-[#101828]' : 'text-[#98A2B3]')}>
          {loading ? 'Loading…' : selected ? selected.name : placeholder}
        </span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {panel}
    </div>
  );
}

function ColorSwatch({ hex, size = 'h-7 w-7' }) {
  return <span className={cx('shrink-0 rounded-full border border-[#EAECF0]', size)} style={{ backgroundColor: hex }} aria-hidden="true" />;
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MO_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const pad2 = (n) => String(n).padStart(2, '0');
const fmtChipDate = (d) => `${DOW_SHORT[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`;
const fmtChipTime = (d) => {
  const h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad2(d.getMinutes())} ${ap}`;
};
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);

// Estimated Delivery's Duration presets (in minutes, so "30 min" and a
// Custom hours+minutes value both fit the same unit) — picking one sets
// draftDurationMinutes directly; Ready By (Received + this duration) is
// always recomputed from it, never stored separately.
const DURATION_PRESETS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hr' },
  { minutes: 120, label: '2 hr' },
  { minutes: 180, label: '3 hr' },
  { minutes: 240, label: '4 hr' },
  { minutes: 360, label: '6 hr' },
  { minutes: 480, label: '8 hr' },
  { minutes: 720, label: '12 hr' },
  { minutes: 1440, label: '24 hr' },
];

function durationLabel(minutes) {
  const preset = DURATION_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Full weeks (leading/trailing days from the adjacent month included, greyed out) for a calendar-grid month view. */
function buildCalendarGrid(year, month) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    nextDay += 1;
  }
  return cells;
}

/** "1 hr 59 min from now" / "2 days ago" / "now" — no date library in this project, so this is plain arithmetic. */
function relativeFromNow(target, now) {
  const diffMs = target.getTime() - now.getTime();
  const past = diffMs < 0;
  const totalMins = Math.round(Math.abs(diffMs) / 60000);
  if (totalMins < 1) return 'now';
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  let label;
  if (days > 0) label = `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hr` : ''}`;
  else if (hours > 0) label = `${hours} hr${mins ? ` ${mins} min` : ''}`;
  else label = `${mins} min`;
  return `${label} ${past ? 'ago' : 'from now'}`;
}

/**
 * "Ready By" date+time picker for Estimated Delivery — a month calendar
 * (past days disabled, since a device can't be ready before now) plus
 * Hour/Minute/AM-PM selects and a live "picked date/time · relative to now"
 * summary, modeled on a reference design. `value`/`onChange` are a plain
 * Date, same as the state this replaced (draftReadyBy) — this component
 * owns no state of the actual value, only which month is currently shown.
 */
function ReadyByPicker({ value, onChange }) {
  const [viewDate, setViewDate] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const now = new Date();
  const today = startOfDay(now);
  const isCurrentMonth = viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth();

  const cells = useMemo(() => buildCalendarGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);

  const goPrevMonth = () => setViewDate((d) => (isCurrentMonth ? d : new Date(d.getFullYear(), d.getMonth() - 1, 1)));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const pickDate = (date) => {
    if (startOfDay(date) < today) return;
    const next = new Date(value);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    onChange(next);
    if (date.getMonth() !== viewDate.getMonth() || date.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const setTime = (nextHour12, nextMinute, nextAmPm) => {
    const h = (nextHour12 % 12) + (nextAmPm === 'PM' ? 12 : 0);
    const next = new Date(value);
    next.setHours(h, nextMinute, 0, 0);
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          disabled={isCurrentMonth}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#F0FDF4] disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-bold text-[#101828]">
          {MO_FULL[viewDate.getMonth()]}, {viewDate.getFullYear()}
        </p>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#F0FDF4]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1.5 text-center">
        {DOW_SHORT.map((d) => (
          <span key={d} className="text-[0.65rem] font-bold uppercase tracking-wide text-[#667085]">
            {d}
          </span>
        ))}
        {cells.map(({ date, inMonth }) => {
          const disabled = startOfDay(date) < today;
          const selected = sameDay(date, value);
          const isToday = sameDay(date, now);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => pickDate(date)}
              disabled={disabled}
              className={cx(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition',
                selected
                  ? 'bg-[#15803D] text-white'
                  : disabled
                    ? 'cursor-not-allowed text-[#D0D5DD]'
                    : !inMonth
                      ? 'text-[#98A2B3] hover:bg-[#F0FDF4]'
                      : isToday
                        ? 'text-[#15803D] hover:bg-[#F0FDF4]'
                        : 'text-[#101828] hover:bg-[#F0FDF4]',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#667085]">Hour</p>
          <select
            aria-label="Ready by hour"
            className="w-full rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-2 text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#DCFCE7]"
            value={hour12}
            onChange={(e) => setTime(Number(e.target.value), minute, ampm)}
          >
            {HOURS_12.map((h) => (
              <option key={h} value={h}>
                {pad2(h)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#667085]">Minute</p>
          <select
            aria-label="Ready by minute"
            className="w-full rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-2 text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#DCFCE7]"
            value={minute}
            onChange={(e) => setTime(hour12, Number(e.target.value), ampm)}
          >
            {MINUTES_60.map((m) => (
              <option key={m} value={m}>
                {pad2(m)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#667085]">AM / PM</p>
          <select
            aria-label="Ready by AM or PM"
            className="w-full rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-2 text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#DCFCE7]"
            value={ampm}
            onChange={(e) => setTime(hour12, minute, e.target.value)}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#F0FDF4] px-4 py-3">
        <p className="text-sm font-bold text-[#15803D]">
          {DOW_SHORT[value.getDay()]}, {value.getDate()} {MO[value.getMonth()]} – {hour12}:{pad2(minute)} {ampm}
        </p>
        <p className="text-xs text-[#5C8F74]">{relativeFromNow(value, now)}</p>
      </div>
    </div>
  );
}

/**
 * Shared date+time bottom sheet — wraps ReadyByPicker (the same calendar +
 * Hour/Minute/AM-PM controls Estimated Delivery has always used) in a
 * modal, with its own draft state so opening it, poking around the
 * calendar, then dismissing (backdrop tap) never touches the committed
 * value until the confirm button is pressed. Used for BOTH Received and
 * Ready By — one picker implementation, not two — with the caller
 * supplying the copy and deciding what committing the draft actually means
 * (setDraftReceivedAt directly for Received; back-computing Duration for
 * Ready By, since Ready By itself is a derived value with no state of its
 * own — see draftReadyBy's useMemo below).
 */
function DateTimeSheet({ title, description, confirmLabel, initialValue, onConfirm, onClose }) {
  const [draft, setDraft] = useState(initialValue);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[#EAECF0] sm:hidden" />
        <h2 className="text-lg font-bold text-[#101828]">{title}</h2>
        <p className="mt-1 text-sm text-[#667085]">{description}</p>

        <div className="mt-4">
          <ReadyByPicker value={draft} onChange={setDraft} />
        </div>

        <button
          type="button"
          onClick={() => onConfirm(draft)}
          className={cx('mt-4 w-full rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#166534]', FOCUS_RING)}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * "Duration" bottom sheet — a preset grid (DURATION_PRESETS) plus a Custom
 * hours+minutes pair. Picking a preset applies it immediately; Custom needs
 * "Apply" since it's two number inputs, not one tap.
 */
function DurationSheet({ initialMinutes, onConfirm, onClose }) {
  const isPreset = DURATION_PRESETS.some((p) => p.minutes === initialMinutes);
  const [mode, setMode] = useState(isPreset ? 'preset' : 'custom');
  const [customHours, setCustomHours] = useState(Math.floor(initialMinutes / 60));
  const [customMinutes, setCustomMinutes] = useState(initialMinutes % 60);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[#EAECF0] sm:hidden" />
        <h2 className="text-lg font-bold text-[#101828]">Duration</h2>
        <p className="mt-1 text-sm text-[#667085]">How long will this repair take?</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.minutes}
              type="button"
              onClick={() => onConfirm(p.minutes)}
              className={cx(
                'rounded-xl border px-3 py-2.5 text-sm font-bold transition',
                mode === 'preset' && initialMinutes === p.minutes
                  ? 'border-[#15803D] bg-[#F0FDF4] text-[#15803D]'
                  : 'border-[#EAECF0] text-[#344054] hover:border-[#86EFAC]',
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={cx(
              'rounded-xl border px-3 py-2.5 text-sm font-bold transition',
              mode === 'custom' ? 'border-[#15803D] bg-[#F0FDF4] text-[#15803D]' : 'border-[#EAECF0] text-[#344054] hover:border-[#86EFAC]',
            )}
          >
            Custom
          </button>
        </div>

        {mode === 'custom' ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#667085]">Hours</p>
              <input
                type="number"
                min={0}
                max={999}
                value={customHours}
                onChange={(e) => setCustomHours(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-2 text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#DCFCE7]"
              />
            </div>
            <div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#667085]">Minutes</p>
              <input
                type="number"
                min={0}
                max={59}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-2 text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#DCFCE7]"
              />
            </div>
            <button
              type="button"
              onClick={() => onConfirm(Math.max(1, customHours * 60 + customMinutes))}
              className={cx('col-span-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#166534]', FOCUS_RING)}
            >
              Apply
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Record Voice Note — a real recorder built on the browser's own
 * MediaRecorder/getUserMedia APIs (no library, nothing to install; both are
 * standard in every evergreen browser). There is no backend field or
 * upload endpoint for a booking's voice note anywhere in this codebase
 * (confirmed — same investigation noted near the top of this file), so —
 * same "estimate only" treatment as Estimated Delivery and Customer repair
 * approval above — the clip lives only in this component's own state
 * (an in-memory object URL) and is discarded on delete/re-record or when
 * this component unmounts; it is never submitted with the booking. If a
 * real voice-note upload endpoint is ever added, this is the one place a
 * fetch call would be wired in.
 */
function VoiceNoteCard() {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | recording | recorded
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioElRef = useRef(null);
  const audioUrlRef = useRef('');
  audioUrlRef.current = audioUrl;

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      stopStream();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    },
    [],
  );

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setStatus('recorded');
        stopStream();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setStatus('recording');
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Microphone access was denied or is unavailable.');
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function deleteRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setStatus('idle');
    setSeconds(0);
    setIsPlaying(false);
  }

  function togglePlay() {
    const el = audioElRef.current;
    if (!el) return;
    if (isPlaying) el.pause();
    else el.play();
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
          <Mic className="h-4.5 w-4.5 text-[#15803D]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#101828]">Record Voice Note</span>
          <span className="block text-xs text-[#667085]">Record a voice note (optional)</span>
        </span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform duration-200', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      <div className={cx('grid transition-all duration-300 ease-in-out', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          <div className="pt-3">
            {status === 'idle' ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#166534]"
              >
                <Mic className="h-4.5 w-4.5" aria-hidden="true" />
                Record voice note
              </button>
            ) : status === 'recording' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
                    Recording…
                  </span>
                  <span className="text-sm font-bold text-red-600">{fmt(seconds)}</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Stop recording
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl bg-[#F0FDF4] px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#15803D]">
                    <Music2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#101828]">Voice Note</p>
                    <p className="text-xs text-[#667085]">{fmt(seconds)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-3 py-2.5 text-sm font-bold text-[#15803D] transition hover:bg-[#F0FDF4]"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={deleteRecording}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
                <audio
                  ref={audioElRef}
                  src={audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One Device Photos tile — a hidden file input behind a dashed drop-zone
 * button, or the uploaded thumbnail with a remove button once one exists.
 * The browser's own file picker already offers Camera vs Photo Library on
 * mobile, so there's no separate "choose upload method" control to build.
 */
function PhotoTile({ label, url, uploading, error, onUpload, onRemove }) {
  const inputRef = useRef(null);
  return (
    <div>
      <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-[#667085]">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      {url ? (
        <div className="relative overflow-hidden rounded-xl border border-[#EAECF0]">
          {/* eslint-disable-next-line @next/next/no-img-element -- shop-uploaded device photo, remote media URL. */}
          <img src={url} alt={label} className="h-24 w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#D0D5DD] bg-[#F9FAFB] text-[#98A2B3] transition hover:border-[#86EFAC] disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Camera className="h-5 w-5" aria-hidden="true" />}
          <span className="text-xs font-semibold">{uploading ? 'Uploading…' : 'Add photo'}</span>
        </button>
      )}
      {error ? <p className="mt-1 text-[0.65rem] text-red-600">{error}</p> : null}
    </div>
  );
}

/**
 * One "Add Issue / Service" accordion row — a real repair category (from
 * relevantRepairCategories) plus its real services (from repairServices,
 * grouped by categoryId). Selection state is the page's own
 * form.serviceIds/toggleService, unchanged; this component only owns
 * whether it's expanded.
 */
function IssueCategoryRow({
  category,
  services,
  expanded,
  onToggleExpand,
  selectedIds,
  onToggleService,
  isOther,
  otherValue,
  onOtherChange,
  draftPrices,
  draftWarranty,
  onDraftPriceChange,
  onDraftWarrantyChange,
}) {
  const Icon = iconForRepairCategory(category.displayName || category.name);
  const selectedCount = services.filter((s) => selectedIds.includes(s.id)).length;
  const name = category.displayName || category.name || 'Repair Category';

  return (
    <div
      className={cx(
        'self-start overflow-hidden rounded-2xl border bg-white transition',
        selectedCount > 0 ? 'border-[#86EFAC] shadow-[0_1px_3px_rgba(16,128,61,0.1)]' : 'border-[#EAECF0] hover:border-[#86EFAC] hover:shadow-[0_1px_3px_rgba(16,24,40,0.06)]',
      )}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className={cx('flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition', expanded ? 'bg-[#F9FAFB]' : 'hover:bg-[#F9FAFB]')}
      >
        <span
          className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
            selectedCount > 0 ? 'bg-[#15803D] text-white' : 'bg-[#F0FDF4] text-[#15803D]',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#101828]">{name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#667085]">
            {services.length} option{services.length === 1 ? '' : 's'}
            {selectedCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[0.68rem] font-bold text-[#15803D]">
                {selectedCount} selected
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform duration-200', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      <div className={cx('grid transition-all duration-200 ease-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-dashed border-[#EAECF0] px-3 py-3">
            {services.length === 0 && !isOther ? (
              <p className="text-xs text-[#98A2B3]">No services listed under this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {services.map((s) => {
                  const checked = selectedIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className={cx(
                        'overflow-hidden rounded-xl border transition',
                        checked ? 'border-[#15803D] bg-[#F0FDF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)]' : 'border-[#E4E7EC] bg-white hover:border-[#86EFAC]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                        <span className={cx('flex min-w-0 items-center gap-2 truncate text-sm font-semibold', checked ? 'text-[#15803D]' : 'text-[#344054]')}>
                          {checked ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                          <span className="truncate">{s.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleService(s.id)}
                          aria-pressed={checked}
                          className={cx(
                            'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition',
                            checked
                              ? 'border border-[#D0D5DD] bg-white text-[#667085] hover:border-red-300 hover:bg-red-50 hover:text-red-600'
                              : 'bg-[#15803D] text-white hover:bg-[#166534]',
                            FOCUS_RING,
                          )}
                        >
                          {checked ? (
                            <>
                              <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                            </>
                          )}
                        </button>
                      </div>

                      {checked ? (
                        <div className="space-y-3 border-t border-dashed border-[#BBF7D0] bg-white px-3.5 py-3.5">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-end">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-[#344054]" htmlFor={`svc-price-${s.id}`}>
                                Price
                              </label>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#98A2B3]">₹</span>
                                <input
                                  id={`svc-price-${s.id}`}
                                  type="number"
                                  min="0"
                                  inputMode="decimal"
                                  value={draftPrices[s.id] || ''}
                                  onChange={(e) => onDraftPriceChange(s.id, e.target.value)}
                                  placeholder="0"
                                  className={cx(COMPACT_INPUT_CLS, 'h-10 pl-7 text-sm font-semibold text-[#101828]')}
                                />
                              </div>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold text-[#344054]">Warranty</p>
                              <div className="flex flex-wrap gap-1.5">
                                {WARRANTY_OPTIONS.map((months) => {
                                  const active = draftWarranty[s.id] === months;
                                  return (
                                    <button
                                      key={months}
                                      type="button"
                                      onClick={() => onDraftWarrantyChange(s.id, months)}
                                      aria-pressed={active}
                                      className={cx(
                                        'h-10 rounded-full border px-3.5 text-xs font-bold transition',
                                        active ? 'border-[#15803D] bg-[#15803D] text-white' : 'border-[#D0D5DD] bg-white text-[#344054] hover:border-[#86EFAC]',
                                      )}
                                    >
                                      {months} Months
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <p className="flex items-center gap-1.5 text-[0.7rem] text-[#98A2B3]">
                            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" /> Price adds to Service Charge on the total. Warranty is a note only, not saved.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {isOther ? (
              <textarea
                className={cx(COMPACT_INPUT_CLS, 'min-h-[60px] resize-y')}
                value={otherValue}
                onChange={onOtherChange}
                placeholder="Describe the issue…"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookServicePage() {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchMyProfile()
      .then((data) => alive && setProfile(data))
      .catch((err) => alive && setProfileError(err.message || 'Could not load your shop profile.'));
    return () => {
      alive = false;
    };
  }, []);

  const shopId = profile?.locations?.[0]?.id || null;

  const [activeSection, setActiveSection] = useState('customer');
  // Moved up from just above the JSX return (where it originally lived,
  // right before sectionContent) so section consts defined further down —
  // e.g. deviceSecuritySection's Continue button — can call goNext(). Pure
  // navigation helpers, unrelated to why they were originally placed later.
  const activeIndex = SECTIONS.findIndex((s) => s.key === activeSection);
  const goPrev = () => activeIndex > 0 && setActiveSection(SECTIONS[activeIndex - 1].key);
  // Gated: validates only the CURRENT section's own required fields before
  // advancing (tab-bar clicks below stay free-jump — this is an internal
  // staff tool, not a public form, and the final submit() re-validates
  // everything regardless of which tab was used to get there). On failure,
  // sets that section's field errors and focuses the first invalid one
  // instead of moving to the next tab.
  const goNext = () => {
    if (activeIndex >= SECTIONS.length - 1) return;
    const { errors, firstErrorField, isValid } = validateSection(activeSection);
    if (!isValid) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      focusField(fieldRefs, firstErrorField);
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(SECTION_VALIDATORS[activeSection] || {}).forEach((key) => {
        delete next[key];
      });
      return next;
    });
    setActiveSection(SECTIONS[activeIndex + 1].key);
  };

  // Top stepper tab click — previously a free jump to any tab regardless of
  // validation. Backward/same-step clicks stay free (no re-validation
  // needed to look at a step you already filled in). A forward click,
  // though, must pass the exact same per-section required-field rules
  // goNext() above already enforces for every section it would skip over
  // (clicking Step 4 from Step 1 must not bypass Steps 2 and 3's required
  // fields) — reusing validateSection()/SECTION_VALIDATORS, not a second
  // validation system. The first section that fails blocks the jump: if
  // it's the section already on screen we just show its errors and focus
  // the field (mirrors goNext()'s own behavior); if it's a later section
  // the user tried to skip past, we move there instead of silently doing
  // nothing, using the same jump-to-first-error convention submit() below
  // already relies on.
  const handleTabClick = (targetKey) => {
    const targetIndex = SECTIONS.findIndex((s) => s.key === targetKey);
    if (targetIndex <= activeIndex) {
      setActiveSection(targetKey);
      return;
    }
    for (let i = activeIndex; i < targetIndex; i += 1) {
      const sectionKey = SECTIONS[i].key;
      const { errors, firstErrorField, isValid } = validateSection(sectionKey);
      if (!isValid) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        if (sectionKey === activeSection) {
          focusField(fieldRefs, firstErrorField);
        } else {
          setActiveSection(sectionKey);
          setPendingFocusField(firstErrorField);
        }
        return;
      }
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (let i = activeIndex; i < targetIndex; i += 1) {
        Object.keys(SECTION_VALIDATORS[SECTIONS[i].key] || {}).forEach((key) => {
          delete next[key];
        });
      }
      return next;
    });
    setActiveSection(targetKey);
  };

  // Tab bar auto-scroll — keyed by section, one entry set per rendered step
  // button (see the tab bar's ref callback below). Whenever the active step
  // changes (a tab click, goPrev/goNext, or a validation-error jump via
  // sectionForError), scroll that button into view so switching steps from
  // a Previous/Next button or an off-screen tab never leaves the highlighted
  // step scrolled out of sight.
  const tabRefs = useRef({});
  useEffect(() => {
    tabRefs.current[activeSection]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeSection]);

  // Focuses + smooth-scrolls a field that failed validation, once the
  // section it belongs to has actually switched and rendered (a raw
  // setTimeout after setActiveSection risks running before the new
  // section's inputs exist in the DOM; this effect fires after React has
  // committed the re-render for the new activeSection).
  const [pendingFocusField, setPendingFocusField] = useState(null);
  useEffect(() => {
    if (!pendingFocusField) return;
    focusField(fieldRefs, pendingFocusField);
    setPendingFocusField(null);
  }, [activeSection, pendingFocusField]);

  const [form, setForm] = useState(EMPTY_FORM);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const needsAddress = form.serviceMode !== 'WALK_IN';

  /* ---- Previous-customer type-ahead (Customer Name) — see file header ---- */
  const [directoryBookings, setDirectoryBookings] = useState([]);
  const [autofillNote, setAutofillNote] = useState('');

  useEffect(() => {
    let alive = true;
    fetchShopBookings()
      .then((rows) => alive && setDirectoryBookings(rows))
      .catch(() => {}); // Non-fatal: the plain Customer Name field still works with no directory loaded.
    return () => {
      alive = false;
    };
  }, []);

  const customerDirectory = useMemo(() => deriveCustomers(directoryBookings), [directoryBookings]);

  const pickExistingCustomer = (customer) => {
    const address = addressFieldsFrom(customer.addressBooking);
    setForm((f) => ({
      ...f,
      customerName: customer.name,
      customerMobile: customer.phone || f.customerMobile,
      customerEmail: customer.email || f.customerEmail,
      ...(address || {}),
    }));
    setAutofillNote(
      address
        ? `Loaded ${customer.name}'s details and their last pickup address.`
        : `Loaded ${customer.name}'s details. No saved address found for them yet.`,
    );
    setTimeout(() => setAutofillNote(''), 4000);
  };

  /* ---- Device: category -> brand -> model ----
   * Every fetch here used to swallow its own failure silently (`.catch(() =>
   * setX([]))`), which made a genuine network/backend failure indistinguishable
   * from "this shop truly has zero brands" — both just rendered an empty
   * dropdown. Each level now tracks its own error message and exposes a Retry
   * action, so a failed load is visibly different from an honestly-empty one.
   */
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoriesRetry, setCategoriesRetry] = useState(0);

  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState('');
  const [brandsRetry, setBrandsRetry] = useState(0);

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [modelsRetry, setModelsRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setCategoriesLoading(true);
    setCategoriesError('');
    masterApi
      .get('/master/device-categories')
      .then(unwrap)
      .then((rows) => alive && setCategories(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        if (!alive) return;
        setCategories([]);
        setCategoriesError(err?.message || 'Could not load device categories. Check your connection and try again.');
      })
      .finally(() => alive && setCategoriesLoading(false));
    return () => {
      alive = false;
    };
  }, [categoriesRetry]);

  // ImageSelect matches options by `.id`; categories are otherwise keyed by
  // `.code` (form.categoryCode) here, so `id` is remapped to the code for
  // matching while the real entity id survives as `categoryId`.
  const categoryOptions = useMemo(() => categories.map((c) => ({ ...c, id: c.code, categoryId: c.id })), [categories]);

  useEffect(() => {
    if (!form.categoryCode) {
      setBrands([]);
      setBrandsError('');
      return undefined;
    }
    let alive = true;
    setBrandsLoading(true);
    setBrandsError('');
    masterApi
      .get(`/master/categories/by-code/${encodeURIComponent(String(form.categoryCode).toUpperCase())}/brands`)
      .then(unwrap)
      .then((rows) => alive && setBrands(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        if (!alive) return;
        setBrands([]);
        setBrandsError(err?.message || 'Could not load brands for this category. Check your connection and try again.');
      })
      .finally(() => alive && setBrandsLoading(false));
    return () => {
      alive = false;
    };
  }, [form.categoryCode, brandsRetry]);

  useEffect(() => {
    if (!form.brandId) {
      setModels([]);
      setModelsError('');
      return undefined;
    }
    let alive = true;
    setModelsLoading(true);
    setModelsError('');
    masterApi
      .get(`/master/brands/${form.brandId}/models`)
      .then(unwrap)
      .then((rows) => alive && setModels(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        if (!alive) return;
        setModels([]);
        setModelsError(err?.message || 'Could not load models for this brand. Check your connection and try again.');
      })
      .finally(() => alive && setModelsLoading(false));
    return () => {
      alive = false;
    };
  }, [form.brandId, modelsRetry]);

  const categoryModels = useMemo(() => {
    if (!form.categoryId) return models;
    return models.filter((m) => !m.categoryId || m.categoryId === form.categoryId);
  }, [models, form.categoryId]);

  const selectedModel = useMemo(
    () => categoryModels.find((m) => m.id === form.modelId) || null,
    [categoryModels, form.modelId],
  );
  const selectedBrand = useMemo(() => brands.find((b) => b.id === form.brandId) || null, [brands, form.brandId]);
  const modelColors = cleanList(selectedModel?.colors);
  const modelVariants = cleanList(selectedModel?.ramStorage);
  // Manufacturer model number(s) (e.g. "A2221"), a real field on the same
  // master-data Model row selectedModel already is (confirmed via the admin
  // Models page, which is the only place it's ever entered) — join() the
  // array the way that page's own read views do, since a model can carry
  // more than one code.
  const modelNumbers = cleanList(selectedModel?.modelNumber);

  // Auto-pick the color when a model only offers exactly one — nothing to
  // choose between, so don't make the shop owner click it manually.
  useEffect(() => {
    const colors = cleanList(selectedModel?.colors);
    if (colors.length === 1) {
      setForm((f) => (f.color === colors[0] ? f : { ...f, color: colors[0] }));
    }
  }, [selectedModel]);

  // Lazy-loaded color→hex cache — see the file header comment on why
  // colorSwatch.js (a ~32k-entry dataset) is dynamically import()ed here
  // instead of a static top-of-file import.
  const [colorHex, setColorHex] = useState({});
  useEffect(() => {
    if (!modelColors.length) return undefined;
    let alive = true;
    import('@/lib/colorSwatch').then(({ guessColorHex }) => {
      if (!alive) return;
      setColorHex((prev) => {
        let changed = false;
        const next = { ...prev };
        modelColors.forEach((name) => {
          if (!(name in next)) {
            next[name] = guessColorHex(name);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    });
    return () => {
      alive = false;
    };
  }, [modelColors]);
  const hexOfColor = (name) => colorHex[name] || '#9CA3AF';

  // Selected-device preview modal — same two-step open/visible fade+scale
  // pattern as the cart page's product-image lightbox (ProductImage in
  // src/app/(site)/account/cart/page.js), reused here for the "Selected
  // Device" summary card. Reads selectedBrand/selectedModel/form.color/
  // form.variant live, so it always reflects whatever is currently picked —
  // there's no separate snapshot to go stale.
  const [devicePreviewOpen, setDevicePreviewOpen] = useState(false);
  const [devicePreviewVisible, setDevicePreviewVisible] = useState(false);

  // Zoom/pan for the preview image — mouse wheel, on-screen +/- buttons,
  // keyboard (+/-/0), and click-drag to pan once zoomed in.
  const PREVIEW_MIN_ZOOM = 1;
  const PREVIEW_MAX_ZOOM = 4;
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [previewDragging, setPreviewDragging] = useState(false);
  const previewDragRef = useRef(null);
  const previewImgWrapRef = useRef(null);

  const zoomPreviewBy = (delta) => {
    setPreviewZoom((z) => {
      const next = Math.min(PREVIEW_MAX_ZOOM, Math.max(PREVIEW_MIN_ZOOM, +(z + delta).toFixed(2)));
      if (next === PREVIEW_MIN_ZOOM) setPreviewPan({ x: 0, y: 0 });
      return next;
    });
  };
  const zoomPreviewIn = () => zoomPreviewBy(0.5);
  const zoomPreviewOut = () => zoomPreviewBy(-0.5);
  const resetPreviewZoom = () => {
    setPreviewZoom(1);
    setPreviewPan({ x: 0, y: 0 });
  };

  const openDevicePreview = () => {
    resetPreviewZoom();
    setDevicePreviewOpen(true);
    requestAnimationFrame(() => setDevicePreviewVisible(true));
  };
  const closeDevicePreview = () => {
    setDevicePreviewVisible(false);
    setTimeout(() => setDevicePreviewOpen(false), 200);
  };
  useEffect(() => {
    if (!devicePreviewOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') closeDevicePreview();
      else if (e.key === '+' || e.key === '=') zoomPreviewIn();
      else if (e.key === '-' || e.key === '_') zoomPreviewOut();
      else if (e.key === '0') resetPreviewZoom();
    }
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicePreviewOpen]);

  // Mouse wheel to zoom — attached as a native, non-passive listener so
  // preventDefault() actually stops the page from scrolling behind the
  // modal (React's onWheel is passive by default and can't do that).
  useEffect(() => {
    const el = previewImgWrapRef.current;
    if (!el || !devicePreviewOpen) return undefined;
    function onWheel(e) {
      e.preventDefault();
      zoomPreviewBy(e.deltaY < 0 ? 0.25 : -0.25);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicePreviewOpen]);

  // Click-drag to pan once zoomed in — only active while previewDragging,
  // tracked on window so the drag keeps following the cursor even past the
  // image's own edges.
  const startPreviewDrag = (e) => {
    if (previewZoom <= PREVIEW_MIN_ZOOM) return;
    e.preventDefault();
    previewDragRef.current = { startX: e.clientX, startY: e.clientY, panX: previewPan.x, panY: previewPan.y };
    setPreviewDragging(true);
  };
  useEffect(() => {
    if (!previewDragging) return undefined;
    function onMove(e) {
      const d = previewDragRef.current;
      if (!d) return;
      setPreviewPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) });
    }
    function onUp() {
      setPreviewDragging(false);
      previewDragRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [previewDragging]);

  /* ---- Problem & Service Type ---- */
  const [repairCategories, setRepairCategories] = useState([]);
  const [repairServices, setRepairServices] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      masterApi.get('/master/repair-categories').then(unwrap).catch(() => []),
      masterApi.get('/master/repair-services').then(unwrap).catch(() => []),
    ]).then(([cats, svcs]) => {
      if (!alive) return;
      setRepairCategories(Array.isArray(cats) ? cats : []);
      setRepairServices(Array.isArray(svcs) ? svcs : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const relevantRepairCategories = useMemo(
    () =>
      repairCategories
        .filter((c) => c && c.isActive !== false)
        .filter((c) => !form.categoryId || !c.deviceCategoryId || c.deviceCategoryId === form.categoryId)
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)),
    [repairCategories, form.categoryId],
  );

  const chosenServices = useMemo(() => repairServices.filter((s) => form.serviceIds.includes(s.id)), [repairServices, form.serviceIds]);

  const toggleService = (id) => {
    setForm((f) => {
      const has = f.serviceIds.includes(id);
      return { ...f, serviceIds: has ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id] };
    });
  };

  // "Add Issue / Service" accordion (3rd tab) — same real
  // relevantRepairCategories/repairServices/serviceIds/toggleService this
  // page already had, grouped by category instead of one active category at
  // a time. Nothing about the API/state shape changes; this is a second,
  // per-category view onto the same data the old Service Category
  // select + Service Type chips used.
  const servicesByCategoryId = useMemo(() => {
    const map = new Map();
    repairServices.forEach((s) => {
      if (!map.has(s.categoryId)) map.set(s.categoryId, []);
      map.get(s.categoryId).push(s);
    });
    return map;
  }, [repairServices]);
  const [expandedIssueCategories, setExpandedIssueCategories] = useState([]);
  const toggleIssueCategory = (id) => {
    setExpandedIssueCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const isOtherIssueCategory = (c) => /other|misc/i.test(c?.displayName || c?.name || '');

  // Local-only per-service price/warranty drafts — see the WARRANTY_OPTIONS
  // comment above. Keyed by repairService id, never read by validate()/
  // submit(), never sent to createShopBooking.
  const [draftServicePrices, setDraftServicePrices] = useState({});
  const [draftServiceWarranty, setDraftServiceWarranty] = useState({});
  const setDraftServicePrice = (id, value) => setDraftServicePrices((p) => ({ ...p, [id]: value }));
  const setDraftServiceWarrantyMonths = (id, months) =>
    setDraftServiceWarranty((w) => ({ ...w, [id]: w[id] === months ? '' : months }));
  const draftServicesSubtotal = useMemo(
    () => chosenServices.reduce((sum, s) => sum + (Number(draftServicePrices[s.id]) || 0), 0),
    [chosenServices, draftServicePrices],
  );

  // Sums every entered per-service Price into the real, submitted
  // form.serviceCharge — the only field the booking payload actually has
  // for a repair charge (no per-item price line exists there). This is
  // now the sole way Service Charge gets set; the standalone Pricing
  // charges card was removed from the Pickup tab per request.
  useEffect(() => {
    setForm((f) => {
      const next = draftServicesSubtotal > 0 ? String(draftServicesSubtotal) : '';
      return f.serviceCharge === next ? f : { ...f, serviceCharge: next };
    });
  }, [draftServicesSubtotal]);

  // Estimated Delivery — local-only, see ReadyByPicker's doc comment above
  // for why. draftReceivedAt defaults to the moment this page loaded, but
  // (unlike before) is directly editable via the Received chip. Ready By is
  // deliberately not its own state any more — it's always Received +
  // Duration, recomputed below, so it can never drift out of sync with
  // either input.
  const [draftReceivedAt, setDraftReceivedAt] = useState(() => new Date());
  const [draftDurationMinutes, setDraftDurationMinutes] = useState(120);
  const [receivedPickerOpen, setReceivedPickerOpen] = useState(false);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  const [readyByPickerOpen, setReadyByPickerOpen] = useState(false);
  const draftReadyBy = useMemo(
    () => new Date(draftReceivedAt.getTime() + draftDurationMinutes * 60000),
    [draftReceivedAt, draftDurationMinutes],
  );
  // Ready By has no state of its own (see above), so "manually change Ready
  // By" means back-computing the Duration that would produce it from the
  // current Received time — Ready By then updates the instant Duration
  // does, via the useMemo above. Floored to whole minutes and clamped to at
  // least 1 so a picked time at/before Received can't produce a negative
  // or zero duration.
  function applyReadyBy(next) {
    const minutes = Math.max(1, Math.round((next.getTime() - draftReceivedAt.getTime()) / 60000));
    setDraftDurationMinutes(minutes);
  }

  // Customer repair approval — a local-only confirmation checkbox, same
  // "estimate only" treatment as Estimated Delivery: no consent/approval
  // field exists anywhere in this backend (confirmed investigation), so
  // this is never submitted with the booking, just a shop-side reminder.
  const [customerApproved, setCustomerApproved] = useState(false);

  // Device Security Lock — form.deviceSecurityType/devicePin are the real,
  // submitted fields (see the payload in submit(), above); showSecret and
  // patternDots are transient UI-only state (mask toggle, the pattern
  // grid's visual/in-progress path), never submitted themselves — only the
  // final joined pattern string, written into devicePin the same as a
  // typed PIN or password would be.
  const [showSecret, setShowSecret] = useState(false);
  const [patternDots, setPatternDots] = useState([]);
  // Not state — toggled synchronously inside a single pointer gesture, a
  // re-render-triggering setState would lag one event behind the actual
  // drag. Pointer capture (set in onPointerDown, below) is what keeps
  // pointermove events routed to the grid container even once the finger/
  // cursor has moved on top of a different dot's own element.
  const patternDragging = useRef(false);

  function selectLockType(type) {
    setForm((f) => ({ ...f, deviceSecurityType: type, devicePin: '' }));
    setPatternDots([]);
    setShowSecret(false);
  }

  function togglePatternDot(dot) {
    setPatternDots((prev) => {
      if (prev.includes(dot)) return prev;
      const next = [...prev, dot];
      set('devicePin', next.join('-'));
      return next;
    });
    setFieldErrors((prev) => (prev.devicePin ? { ...prev, devicePin: undefined } : prev));
  }

  function clearPattern() {
    setPatternDots([]);
    set('devicePin', '');
  }

  const deviceLockStatus = useMemo(() => {
    // Derived, not its own form field — see draftReadyBy above for the same
    // "never let a display value drift out of sync with its source" reason.
    // '' (nothing chosen yet) and 'NONE' (No Lock explicitly chosen) both
    // read as the same ready/unlocked summary — they only differ for
    // selection-highlighting and validation, below.
    if (!form.deviceSecurityType || form.deviceSecurityType === 'NONE') {
      return { label: 'No lock set', description: 'Device is currently unlocked and ready for service.', chip: 'READY' };
    }
    const names = { PIN: 'Numeric PIN', Password: 'Password', Pattern: 'Pattern Lock' };
    const nouns = { PIN: 'PIN', Password: 'password', Pattern: 'pattern' };
    return {
      label: names[form.deviceSecurityType] || form.deviceSecurityType,
      description: `Device protected with ${nouns[form.deviceSecurityType] || form.deviceSecurityType}.`,
      chip: 'SECURED',
    };
  }, [form.deviceSecurityType]);

  // Device Missing Parts — see MISSING_PART_ITEMS' doc comment above for
  // why this is local UI state rather than a new form field. One of
  // null | 'missing' | 'damaged' per part; clicking the already-active
  // button clears it (matches "clicking the selected option again clears
  // it").
  const [missingParts, setMissingParts] = useState(() =>
    Object.fromEntries(MISSING_PART_ITEMS.map((item) => [item.key, null])),
  );
  function setPartStatus(key, status) {
    setMissingParts((prev) => ({ ...prev, [key]: prev[key] === status ? null : status }));
  }
  const flaggedPartsCount = useMemo(() => Object.values(missingParts).filter(Boolean).length, [missingParts]);
  const missingPartsSummary = useMemo(
    () =>
      MISSING_PART_ITEMS.filter((item) => missingParts[item.key])
        .map((item) => `${item.title}: ${missingParts[item.key] === 'missing' ? 'Missing' : 'Damaged'}`)
        .join(', '),
    [missingParts],
  );

  // Device Photos — real uploads via uploadShopDevicePhoto() (src/lib/
  // shopBooking.js), the same shop-token media upload the public /repair
  // flow's customer-facing photo picker uses. photoUploading/photoError are
  // per-slot transient UI state (never submitted); the URLs themselves live
  // in form.frontImageUrl/backImageUrl/damageImageUrl/additionalImageUrls,
  // which ARE submitted (see the payload in submit(), below).
  const [photoUploading, setPhotoUploading] = useState({});
  const [photoError, setPhotoError] = useState({});

  async function handlePhotoUpload(slot, file) {
    if (!file) return;
    setPhotoUploading((u) => ({ ...u, [slot]: true }));
    setPhotoError((e) => ({ ...e, [slot]: '' }));
    try {
      const url = await uploadShopDevicePhoto(file, slot);
      if (slot === 'additional') {
        setForm((f) => ({ ...f, additionalImageUrls: [...f.additionalImageUrls, url] }));
      } else {
        set(`${slot}ImageUrl`, url);
      }
    } catch (err) {
      setPhotoError((e) => ({ ...e, [slot]: err?.message || 'Upload failed. Please try again.' }));
    } finally {
      setPhotoUploading((u) => ({ ...u, [slot]: false }));
    }
  }

  function removePhoto(slot) {
    set(`${slot}ImageUrl`, '');
  }

  function removeAdditionalPhoto(url) {
    setForm((f) => ({ ...f, additionalImageUrls: f.additionalImageUrls.filter((u) => u !== url) }));
  }

  /* ---- Pricing ---- */
  const totals = useMemo(() => estimateTotal(form), [form]);

  // Service Booking Devices List — derives entirely from state this page
  // already has (customer/device fields, chosenServices, totals.total,
  // deviceSecurityType, missingPartsSummary), nothing new is stored here.
  // This client only ever builds ONE device per booking (no array-shaped
  // device state exists anywhere in this codebase), so bookingDevices is a
  // single-item array — array-shaped on purpose so a future multi-device
  // change has a real structure to extend rather than a single flat
  // device object to refactor away from. paymentMode has no confirmed
  // backend field anywhere in this app; it's included in the payload
  // best-effort (the create-booking call is already a stub — see
  // shopBooking.js) rather than invented as a real, guaranteed-persisted
  // field.
  const [paymentMode, setPaymentMode] = useState('');
  const bookingDevices = useMemo(() => {
    if (!form.brandName && !form.modelName) return [];
    return [
      {
        brand: form.brandName,
        model: form.modelName,
        image: selectedModel?.imageUrl || selectedBrand?.imageUrl || null,
        modelCode: modelNumbers.join(' / '),
        selectedServices: chosenServices,
        estimatedAmount: totals.total,
        isPrimary: true,
        deviceSecurityLock: form.deviceSecurityType,
        deviceMissingParts: missingPartsSummary,
      },
    ];
  }, [
    form.brandName,
    form.modelName,
    selectedModel,
    selectedBrand,
    modelNumbers,
    chosenServices,
    totals.total,
    form.deviceSecurityType,
    missingPartsSummary,
  ]);
  const grandTotal = bookingDevices.reduce((sum, d) => sum + Number(d.estimatedAmount || 0), 0);

  /* ---- Submit ---- */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldRefs = useRef({});
  const [confirmed, setConfirmed] = useState(null);
  const [trackingCopied, setTrackingCopied] = useState(false);

  // Booking Confirmation's "Customer Details" card — shopLocation/shopAddress
  // reuse the exact same real profile.locations[0] fields (name/street/area/
  // taluk/district/state/pincode) the account settings page's own QR/address
  // display already builds from, and profile.phone (the owner's own number,
  // the only real "shop number" this profile response carries).
  const shopLocation = profile?.locations?.[0] || null;
  const shopAddress = shopLocation
    ? [shopLocation.street, shopLocation.area, shopLocation.taluk, shopLocation.district, shopLocation.state, shopLocation.pincode]
        .filter(Boolean)
        .join(', ')
    : '';

  function copyTrackingId() {
    if (!confirmed || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(String(confirmed.bookingNumber || confirmed.id))
      .then(() => {
        setTrackingCopied(true);
        setTimeout(() => setTrackingCopied(false), 1600);
      })
      .catch(() => {});
  }

  // Same fields/messages the old flat validate() always checked — now built
  // from SECTION_VALIDATORS so goNext() and submit() share one source of
  // truth instead of two hand-written copies of the same rules.
  const validateSection = (sectionKey) => {
    const schema = SECTION_VALIDATORS[sectionKey];
    if (!schema) return { errors: {}, firstErrorField: null, isValid: true };
    return validateForm(schema, { ...form, needsAddress });
  };

  const validateAll = () => {
    const merged = Object.assign({}, ...Object.values(SECTION_VALIDATORS));
    return validateForm(merged, { ...form, needsAddress });
  };

  const submit = async () => {
    const { errors, firstErrorField, isValid } = validateAll();
    if (!isValid) {
      setFieldErrors(errors);
      setSubmitError(errors[firstErrorField]);
      const jumpTo = sectionForField(firstErrorField);
      if (jumpTo) {
        setActiveSection(jumpTo);
        setPendingFocusField(firstErrorField);
      } else {
        focusField(fieldRefs, firstErrorField);
      }
      return;
    }
    setFieldErrors({});
    setSubmitError('');
    setSubmitting(true);
    // Temporary debug aid per request — the type and whether a value was
    // captured, never the PIN/password/pattern itself.
    console.log('Device lock type:', form.deviceSecurityType);
    console.log('Has device lock value:', Boolean(form.devicePin));
    try {
      const payload = {
        shopId,
        customerName: form.customerName.trim(),
        customerMobile: form.customerMobile.trim(),
        customerAltMobile: form.customerAltMobile.trim() || undefined,
        customerEmail: form.customerEmail.trim() || undefined,
        categoryId: form.categoryId,
        brandId: form.brandId,
        brandName: form.brandName,
        modelId: form.modelId,
        modelName: form.modelName,
        color: form.color || undefined,
        ramStorage: form.variant || undefined,
        imei: form.imei.trim() || undefined,
        deviceSecurityType: form.deviceSecurityType && form.deviceSecurityType !== 'NONE' ? form.deviceSecurityType : undefined,
        devicePin: form.devicePin || undefined,
        missingDamageParts: missingPartsSummary || undefined,
        paymentMode: paymentMode || undefined,
        services: chosenServices.map((s) => ({ repairServiceId: s.id, serviceCode: s.code, serviceName: s.name })),
        issueSummary: chosenServices.map((s) => s.name).join(', ') || form.issueDescription.slice(0, 120),
        issueDescription: form.issueDescription.trim() || undefined,
        deviceCondition: form.deviceCondition || undefined,
        frontImageUrl: form.frontImageUrl || undefined,
        backImageUrl: form.backImageUrl || undefined,
        damageImageUrl: form.damageImageUrl || undefined,
        additionalImageUrls: form.additionalImageUrls.length ? form.additionalImageUrls : undefined,
        serviceMode: form.serviceMode,
        pickupAddress: needsAddress
          ? {
              addressLine: form.addressLine.trim(),
              landmark: form.landmark.trim() || undefined,
              pincode: form.pincode.trim(),
              city: form.city.trim(),
              district: form.district.trim() || undefined,
              state: form.state.trim(),
            }
          : undefined,
        pickupDate: form.pickupDate,
        pickupSlotStart: form.pickupSlotStart,
        pickupSlotEnd: form.pickupSlotEnd,
        pricing: {
          inspectionCharge: Number(form.inspectionCharge) || 0,
          serviceCharge: Number(form.serviceCharge) || 0,
          partsCharge: Number(form.partsCharge) || 0,
          pickupCharge: Number(form.pickupCharge) || 0,
          discount: Number(form.discount) || 0,
          taxPercent: Number(form.taxPercent) || 0,
          estimatedAmount: totals.total,
        },
      };
      const created = await createShopBooking(payload);
      setConfirmed(created);
      // Booking Confirmation is now its own tab (9th/last), not a separate
      // full-page takeover — this is the one place that navigates there,
      // and only after a real successful response, never speculatively.
      setActiveSection('confirmation');
    } catch (e) {
      setSubmitError(e.message || 'Could not create the booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    // setPhotos/setDayIdx were leftover calls to state that no longer
    // exists (both predate the current Device Photos / Estimated Delivery
    // implementations) — calling either would throw ReferenceError and
    // break this function outright, including from the new Booking
    // Confirmation tab's "Create another booking" button. Removed, and
    // every other local-only state this flow has picked up since is reset
    // here too so a fresh booking genuinely starts clean.
    setForm(EMPTY_FORM);
    setConfirmed(null);
    setSubmitError('');
    setActiveSection('customer');
    setAutofillNote('');
    setPhotoUploading({});
    setPhotoError({});
    setShowSecret(false);
    setPatternDots([]);
    setMissingParts(Object.fromEntries(MISSING_PART_ITEMS.map((item) => [item.key, null])));
    setPaymentMode('');
    setCustomerApproved(false);
  };

  // Booking Confirmation used to be a full-page early return here,
  // replacing the whole wizard the instant `confirmed` was set. Per
  // request it's now its own tab (confirmationSection, built alongside the
  // other sections below, wired into SECTIONS/sectionContent as
  // 'confirmation') so it can appear in the top step navigation like every
  // other section; submit() above navigates there with setActiveSection
  // only after a real successful response.

  /* ---- Section content (rendered once, shown for whichever is active) ---- */

  const customerSection = (
    <Section title="Customer Details" subtitle="Enter customer contact information" icon={User}>
      {autofillNote ? (
        <div role="status" className="mb-3 flex items-start gap-2 rounded-lg border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-xs font-medium text-[#15803D]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{autofillNote}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Customer Name" required error={fieldErrors.customerName} fieldRef={registerField(fieldRefs, 'customerName')}>
          <CustomerNameField
            value={form.customerName}
            onChangeText={(v) => {
              set('customerName', v);
              if (fieldErrors.customerName) setFieldErrors((prev) => ({ ...prev, customerName: undefined }));
            }}
            directory={customerDirectory}
            onPick={pickExistingCustomer}
          />
          <p className="mt-1 text-[0.68rem] text-[#98A2B3]">Start typing to see customers who&apos;ve booked with you before.</p>
        </FormField>
        <FormField label="Mobile Number" required error={fieldErrors.customerMobile} fieldRef={registerField(fieldRefs, 'customerMobile')}>
          <IconField icon={Phone}>
            <input
              className={ICON_INPUT_CLS}
              value={form.customerMobile}
              onChange={(e) => {
                set('customerMobile', e.target.value.replace(/[^0-9+ ]/g, ''));
                if (fieldErrors.customerMobile) setFieldErrors((prev) => ({ ...prev, customerMobile: undefined }));
              }}
              placeholder="+91 …"
            />
          </IconField>
        </FormField>
        <FormField label="Alternate Mobile">
          <IconField icon={Phone}>
            <input
              className={ICON_INPUT_CLS}
              value={form.customerAltMobile}
              onChange={(e) => set('customerAltMobile', e.target.value.replace(/[^0-9+ ]/g, ''))}
              placeholder="Optional"
            />
          </IconField>
        </FormField>
        <FormField label="Email">
          <IconField icon={Mail}>
            <input type="email" className={ICON_INPUT_CLS} value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} placeholder="Optional" />
          </IconField>
        </FormField>
      </div>
    </Section>
  );

  const addressSection = (
    <Section title="Address" subtitle="Enter customer address details" icon={MapPin}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="State" required={needsAddress} error={fieldErrors.state} fieldRef={registerField(fieldRefs, 'state')}>
          <IconField icon={MapPin}>
            <input
              className={ICON_INPUT_CLS}
              value={form.state}
              onChange={(e) => {
                set('state', e.target.value);
                if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: undefined }));
              }}
            />
          </IconField>
        </FormField>
        <FormField label="District">
          <IconField icon={MapPin}>
            <input className={ICON_INPUT_CLS} value={form.district} onChange={(e) => set('district', e.target.value)} />
          </IconField>
        </FormField>
        <FormField label="City" required={needsAddress} error={fieldErrors.city} fieldRef={registerField(fieldRefs, 'city')}>
          <IconField icon={MapPin}>
            <input
              className={ICON_INPUT_CLS}
              value={form.city}
              onChange={(e) => {
                set('city', e.target.value);
                if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: undefined }));
              }}
            />
          </IconField>
        </FormField>
        <FormField label="Landmark">
          <IconField icon={Landmark}>
            <input className={ICON_INPUT_CLS} value={form.landmark} onChange={(e) => set('landmark', e.target.value)} />
          </IconField>
        </FormField>
        <FormField label="Door No. / Street" required={needsAddress} error={fieldErrors.addressLine} fieldRef={registerField(fieldRefs, 'addressLine')}>
          <IconField icon={Home}>
            <input
              className={ICON_INPUT_CLS}
              value={form.addressLine}
              onChange={(e) => {
                set('addressLine', e.target.value);
                if (fieldErrors.addressLine) setFieldErrors((prev) => ({ ...prev, addressLine: undefined }));
              }}
            />
          </IconField>
        </FormField>
        <FormField label="Pincode" required={needsAddress} error={fieldErrors.pincode} fieldRef={registerField(fieldRefs, 'pincode')}>
          <IconField icon={MapPin}>
            <input
              className={ICON_INPUT_CLS}
              value={form.pincode}
              onChange={(e) => {
                set('pincode', e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                if (fieldErrors.pincode) setFieldErrors((prev) => ({ ...prev, pincode: undefined }));
              }}
            />
          </IconField>
        </FormField>
      </div>
      {!needsAddress ? (
        <p className="mt-2.5 text-[0.7rem] text-[#98A2B3]">
          Only required for Pickup or Doorstep Service — set on the Pickup / Service Location tab.
        </p>
      ) : null}
    </Section>
  );

  const deviceSectionError = fieldErrors.categoryId || fieldErrors.brandId || fieldErrors.modelId;
  const deviceSection = (
    <Section title="Device Details" icon={Smartphone}>
      {deviceSectionError ? (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {deviceSectionError}
        </p>
      ) : null}
      <div
        ref={(el) => {
          fieldRefs.current.categoryId = el;
          fieldRefs.current.brandId = el;
          fieldRefs.current.modelId = el;
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <div>
          <ImageSelect
            label="Device Category"
            required
            value={form.categoryCode}
            options={categoryOptions}
            loading={categoriesLoading}
            placeholder={categoriesLoading ? 'Loading…' : categoryOptions.length === 0 && !categoriesError ? 'No categories available' : 'Select category'}
            onChange={(cat) => {
              setForm((f) => ({
                ...f,
                categoryCode: cat?.id || '',
                categoryId: cat?.categoryId || '',
                brandId: '',
                brandName: '',
                modelId: '',
                modelName: '',
                color: '',
                variant: '',
              }));
              setFieldErrors((prev) => (prev.categoryId || prev.brandId || prev.modelId ? { ...prev, categoryId: undefined, brandId: undefined, modelId: undefined } : prev));
            }}
          />
          {categoriesError ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.7rem] text-red-600">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              {categoriesError}
              <button type="button" onClick={() => setCategoriesRetry((k) => k + 1)} className="font-bold underline underline-offset-2">
                Retry
              </button>
            </p>
          ) : null}
        </div>

        <div>
          <ImageSelect
            label="Brand"
            required
            value={form.brandId}
            options={brands}
            disabled={!form.categoryCode || brandsLoading}
            loading={brandsLoading}
            placeholder={
              !form.categoryCode
                ? 'Select a category first'
                : brands.length === 0 && !brandsLoading && !brandsError
                  ? 'No brands available for this category'
                  : 'Select brand'
            }
            onChange={(brand) => {
              setForm((f) => ({ ...f, brandId: brand?.id || '', brandName: brand?.name || '', modelId: '', modelName: '', color: '', variant: '' }));
              setFieldErrors((prev) => (prev.categoryId || prev.brandId || prev.modelId ? { ...prev, categoryId: undefined, brandId: undefined, modelId: undefined } : prev));
            }}
          />
          {brandsError ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.7rem] text-red-600">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              {brandsError}
              <button type="button" onClick={() => setBrandsRetry((k) => k + 1)} className="font-bold underline underline-offset-2">
                Retry
              </button>
            </p>
          ) : null}
        </div>

        <div>
          <ImageSelect
            label="Model"
            required
            value={form.modelId}
            options={categoryModels}
            disabled={!form.brandId || modelsLoading}
            loading={modelsLoading}
            placeholder={
              !form.brandId
                ? 'Select a brand first'
                : categoryModels.length === 0 && !modelsLoading && !modelsError
                  ? 'No models available for this brand'
                  : 'Select model'
            }
            onChange={(model) => {
              setForm((f) => ({ ...f, modelId: model?.id || '', modelName: model?.name || '', color: '', variant: '' }));
              setFieldErrors((prev) => (prev.categoryId || prev.brandId || prev.modelId ? { ...prev, categoryId: undefined, brandId: undefined, modelId: undefined } : prev));
            }}
          />
          {modelsError ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.7rem] text-red-600">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              {modelsError}
              <button type="button" onClick={() => setModelsRetry((k) => k + 1)} className="font-bold underline underline-offset-2">
                Retry
              </button>
            </p>
          ) : null}
        </div>

        <FormField label="IMEI / Serial Number">
          <input className={COMPACT_INPUT_CLS} value={form.imei} onChange={(e) => set('imei', e.target.value)} placeholder="Optional" />
        </FormField>

        {modelVariants.length > 0 ? (
          <FormField label="RAM / Storage">
            <select className={COMPACT_INPUT_CLS} value={form.variant} onChange={(e) => set('variant', e.target.value)}>
              <option value="">Select variant</option>
              {modelVariants.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </div>

      {selectedModel ? (
        <div className="mt-3">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-[#667085]">Color</p>
          {modelColors.length === 0 ? (
            <p className="text-sm text-[#98A2B3]">No colors available</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {modelColors.map((name) => {
                const isSel = form.color === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => set('color', name)}
                    aria-pressed={isSel}
                    className={cx(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
                      isSel ? 'border-[#15803D] bg-[#F0FDF4] text-[#15803D]' : 'border-[#D0D5DD] bg-white text-[#344054] hover:border-[#86EFAC]',
                    )}
                  >
                    <ColorSwatch hex={hexOfColor(name)} size="h-4 w-4" />
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {selectedBrand && selectedModel ? (
        <button
          type="button"
          onClick={openDevicePreview}
          aria-label={`Preview ${selectedBrand.name} ${selectedModel.name}`}
          className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] p-3 text-left transition hover:border-[#86EFAC] hover:bg-[#F0FDF4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2"
        >
          <Thumb url={selectedModel.imageUrl} name={selectedModel.name} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Thumb url={selectedBrand.imageUrl} name={selectedBrand.name} size="h-4 w-4" />
              <span className="truncate text-xs font-semibold text-[#667085]">{selectedBrand.name}</span>
            </div>
            <p className="truncate text-sm font-bold text-[#101828]">{selectedModel.name}</p>
            {form.color || form.variant ? (
              <p className="flex items-center gap-1.5 truncate text-xs text-[#667085]">
                {form.color ? <ColorSwatch hex={hexOfColor(form.color)} size="h-3 w-3" /> : null}
                {[form.color, form.variant].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        </button>
      ) : null}

      {devicePreviewOpen && selectedBrand && selectedModel ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedBrand.name} ${selectedModel.name} — preview`}
          onClick={closeDevicePreview}
          className={cx(
            'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 transition-opacity duration-200',
            devicePreviewVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <button
            type="button"
            onClick={closeDevicePreview}
            aria-label="Close preview"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className={cx(
              'relative overflow-hidden rounded-2xl bg-white shadow-2xl transition-transform duration-200',
              devicePreviewVisible ? 'scale-100' : 'scale-95',
            )}
          >
            <div
              ref={previewImgWrapRef}
              onMouseDown={startPreviewDrag}
              className="h-[min(500px,85vh)] w-[min(500px,90vw)] overflow-hidden"
              style={{ cursor: selectedModel.imageUrl && previewZoom > PREVIEW_MIN_ZOOM ? (previewDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {selectedModel.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- master-data model image, remote S3 URL, needs a live zoom/pan transform.
                <img
                  src={selectedModel.imageUrl}
                  alt={selectedModel.name}
                  draggable={false}
                  className="h-full w-full select-none object-contain"
                  style={{
                    transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom})`,
                    transition: previewDragging ? 'none' : 'transform 150ms ease-out',
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#15803D]">{initials(selectedModel.name)}</div>
              )}
            </div>

            {selectedModel.imageUrl ? (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur">
                <button
                  type="button"
                  onClick={zoomPreviewOut}
                  disabled={previewZoom <= PREVIEW_MIN_ZOOM}
                  aria-label="Zoom out"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={resetPreviewZoom}
                  aria-label="Reset zoom"
                  className="min-w-[3rem] rounded-full px-2 py-1 text-center text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  {Math.round(previewZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomPreviewIn}
                  disabled={previewZoom >= PREVIEW_MAX_ZOOM}
                  aria-label="Zoom in"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Section>
  );

  /**
   * Device Information — its own top-nav tab (SECTIONS, above), the last of
   * 5. Per request, this tab now also carries a full copy of Service Price
   * & Issue Estimate's content and a rebuilt Device Photos card (see
   * sectionContent.deviceInfo below) — the SAME pickupSection element is
   * rendered again here rather than duplicated, so both tabs stay backed by
   * one implementation and one set of form state; only one of the two tabs
   * is ever mounted at a time, so there's no double-instance conflict.
   *
   * This section itself: a product preview (real selectedModel/
   * selectedBrand image) plus a read-only Brand/Model recap — reuses
   * form.brandName/modelName, not a second editable control for the same
   * value (those are picked via the ImageSelect pickers on Device Details).
   * Model Number, Storage and Color are real, reusing the exact same
   * selectedModel-derived data (modelNumbers/modelVariants/modelColors) and
   * form.variant/form.color state as Device Details — not a second,
   * independent field.
   */
  const deviceInfoSection = (
    <Section title="Device Information" icon={Info}>
      {/* Product preview — real selectedModel/selectedBrand imageUrl (the
          same master-data fields the Device Details preview button already
          reads), model image preferred over brand image, Thumb's own
          initials fallback when neither exists. Never a hardcoded sample
          image. */}
      {form.brandName || form.modelName ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#EAECF0] bg-white p-3">
          <Thumb url={selectedModel?.imageUrl || selectedBrand?.imageUrl} name={form.modelName || form.brandName} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#101828]">{form.brandName || 'Brand not selected'}</p>
            <p className="truncate text-xs text-[#667085]">{form.modelName || 'Model not selected'}</p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-3">
          <Thumb url={null} name="?" size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#98A2B3]">No device selected yet</p>
            <p className="text-xs text-[#98A2B3]">Pick a brand and model on the Device Details tab.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Brand">
          <input className={COMPACT_INPUT_CLS} value={form.brandName || 'Not selected yet'} disabled />
        </FormField>

        <FormField label="Model">
          <input className={COMPACT_INPUT_CLS} value={form.modelName || 'Not selected yet'} disabled />
        </FormField>

        <FormField label="Model Number" className="sm:col-span-2">
          <input className={COMPACT_INPUT_CLS} value={modelNumbers.join(' / ') || 'Not available'} disabled />
        </FormField>

        <FormField label="Device Color">
          <select
            className={COMPACT_INPUT_CLS}
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            disabled={modelColors.length === 0}
          >
            <option value="">{modelColors.length ? 'Select color' : 'Select a model first'}</option>
            {modelColors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Storage / Variant">
          <select
            className={COMPACT_INPUT_CLS}
            value={form.variant}
            onChange={(e) => set('variant', e.target.value)}
            disabled={modelVariants.length === 0}
          >
            <option value="">{modelVariants.length ? 'Select storage' : 'Select a model first'}</option>
            {modelVariants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </Section>
  );

  /**
   * Device Security Lock — its own top-nav tab (SECTIONS, above), between
   * Device Information and Add Issue / Service. form.deviceSecurityType /
   * devicePin are the real fields (see EMPTY_FORM / the submit() payload
   * above and LOCK_OPTIONS' doc comment) — the same ones Receipt/QR
   * E-Print and the customer app's own order-history screen already read.
   * Pattern Lock has no existing drawing implementation anywhere in this
   * codebase to reuse, so this is a genuinely new, real 3x3 tap-in-sequence
   * grid (not a placeholder) — tapping dots builds devicePin as e.g.
   * "1-2-3-6-9", the same way a typed PIN/password would populate it.
   */
  const deviceSecuritySection = (
    <Section title="Device Security Lock" icon={Lock}>
      <p className="-mt-1 mb-4 text-xs text-[#667085]">Protect the device while it is being serviced.</p>

      <div
        className={cx(
          'flex items-center gap-3 rounded-xl border p-3.5',
          deviceLockStatus.chip === 'SECURED' ? 'border-[#15803D] bg-[#F0FDF4]' : 'border-[#EAECF0] bg-white',
        )}
      >
        <span
          className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            deviceLockStatus.chip === 'SECURED' ? 'bg-[#15803D] text-white' : 'bg-[#F0FDF4] text-[#15803D]',
          )}
        >
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Current Security</p>
          <p className="text-sm font-bold text-[#101828]">{deviceLockStatus.label}</p>
          <p className="text-xs text-[#667085]">{deviceLockStatus.description}</p>
        </div>
        <span
          className={cx(
            'shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide',
            deviceLockStatus.chip === 'SECURED' ? 'bg-[#15803D] text-white' : 'bg-[#DCFCE7] text-[#15803D]',
          )}
        >
          {deviceLockStatus.chip}
        </span>
      </div>

      <div ref={registerField(fieldRefs, 'deviceSecurityType')} className="mt-5">
        <p className="text-sm font-bold text-[#101828]">Choose Device Lock</p>
        <p className="text-xs text-[#667085]">Select the lock currently used on this device.</p>
        {fieldErrors.deviceSecurityType ? <p className="mt-1 text-xs text-red-600">{fieldErrors.deviceSecurityType}</p> : null}

        <div className="mt-3 space-y-2">
          {LOCK_OPTIONS.map((opt) => {
            const selected = form.deviceSecurityType === opt.key;
            return (
              <button
                key={opt.title}
                type="button"
                onClick={() => {
                  selectLockType(opt.key);
                  if (fieldErrors.deviceSecurityType) setFieldErrors((prev) => ({ ...prev, deviceSecurityType: undefined }));
                }}
                aria-pressed={selected}
                className={cx(
                  'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition',
                  selected ? 'border-[#15803D] bg-[#F0FDF4]' : 'border-[#EAECF0] bg-white hover:border-[#86EFAC]',
                )}
              >
                <span
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    selected ? 'bg-[#15803D] text-white' : 'bg-[#F0FDF4] text-[#15803D]',
                  )}
                >
                  <opt.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#101828]">{opt.title}</p>
                  <p className="text-xs text-[#667085]">{opt.subtitle}</p>
                  {opt.example ? <p className="mt-1 text-[0.7rem] text-[#98A2B3]">{opt.example}</p> : null}
                  {opt.badge ? (
                    <span className="mt-1 inline-block rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-[#15803D]">
                      {opt.badge}
                    </span>
                  ) : null}
                  {opt.key === 'Pattern' ? (
                    <div className="mt-1.5 grid w-fit grid-cols-3 gap-1" aria-hidden="true">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#D0D5DD]" />
                      ))}
                    </div>
                  ) : null}
                </div>
                <span
                  className={cx(
                    'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    selected ? 'border-[#15803D] bg-[#15803D]' : 'border-[#D0D5DD]',
                  )}
                >
                  {selected ? <Check className="h-3 w-3 text-white" aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {form.deviceSecurityType === 'PIN' ? (
          <div ref={registerField(fieldRefs, 'devicePin')} className="mt-3 rounded-xl border border-[#EAECF0] bg-white p-4">
            <FormField label="Enter PIN">
              <div className="flex items-center gap-2">
                <input
                  type={showSecret ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.devicePin}
                  onChange={(e) => {
                    set('devicePin', e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (fieldErrors.devicePin) setFieldErrors((prev) => ({ ...prev, devicePin: undefined }));
                  }}
                  placeholder="4–6 digit PIN"
                  className={cx(COMPACT_INPUT_CLS, 'flex-1 tracking-widest')}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? 'Hide PIN' : 'Show PIN'}
                  className="shrink-0 rounded-lg border border-[#D0D5DD] p-2.5 text-[#667085] transition hover:bg-[#F9FAFB]"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </FormField>
            {form.devicePin && form.devicePin.length < 4 ? (
              <p className="mt-1.5 text-xs text-red-600">PIN must contain at least 4 digits.</p>
            ) : fieldErrors.devicePin ? (
              <p className="mt-1.5 text-xs text-red-600">{fieldErrors.devicePin}</p>
            ) : null}
          </div>
        ) : form.deviceSecurityType === 'Password' ? (
          <div ref={registerField(fieldRefs, 'devicePin')} className="mt-3 rounded-xl border border-[#EAECF0] bg-white p-4">
            <FormField label="Enter Password">
              <div className="flex items-center gap-2">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={form.devicePin}
                  onChange={(e) => {
                    set('devicePin', e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16));
                    if (fieldErrors.devicePin) setFieldErrors((prev) => ({ ...prev, devicePin: undefined }));
                  }}
                  placeholder="4–16 letters & numbers"
                  className={cx(COMPACT_INPUT_CLS, 'flex-1')}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? 'Hide password' : 'Show password'}
                  className="shrink-0 rounded-lg border border-[#D0D5DD] p-2.5 text-[#667085] transition hover:bg-[#F9FAFB]"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </FormField>
            {form.devicePin && form.devicePin.length < 4 ? (
              <p className="mt-1.5 text-xs text-red-600">Password must be at least 4 characters.</p>
            ) : fieldErrors.devicePin ? (
              <p className="mt-1.5 text-xs text-red-600">{fieldErrors.devicePin}</p>
            ) : null}
          </div>
        ) : form.deviceSecurityType === 'Pattern' ? (
          <div ref={registerField(fieldRefs, 'devicePin')} className="mt-3 rounded-xl border border-[#EAECF0] bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#667085]">Draw Pattern</p>
              <button type="button" onClick={clearPattern} className="text-xs font-bold text-[#15803D]">
                Clear pattern
              </button>
            </div>
            {/* Real drag input, not decorative: pointer capture on the grid
                itself (set on pointerdown) keeps every subsequent
                pointermove routed here even as the finger/cursor crosses
                onto other dots' own elements; elementFromPoint then finds
                which dot is currently under the pointer. Works for touch
                and mouse alike since Pointer Events unify both. A plain
                tap still works too — each dot's own onClick calls the same
                togglePatternDot, which is a no-op if the drag already
                added that dot. */}
            <div
              className="mx-auto grid w-fit touch-none select-none grid-cols-3 gap-4 py-2"
              onPointerDown={(e) => {
                const dotEl = e.target.closest('[data-pattern-dot]');
                if (!dotEl) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                patternDragging.current = true;
                togglePatternDot(Number(dotEl.dataset.patternDot));
              }}
              onPointerMove={(e) => {
                if (!patternDragging.current) return;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const dotEl = el?.closest('[data-pattern-dot]');
                if (dotEl) togglePatternDot(Number(dotEl.dataset.patternDot));
              }}
              onPointerUp={() => {
                patternDragging.current = false;
              }}
              onPointerCancel={() => {
                patternDragging.current = false;
              }}
            >
              {Array.from({ length: 9 }).map((_, i) => {
                const dot = i + 1;
                const active = patternDots.includes(dot);
                return (
                  <button
                    key={dot}
                    type="button"
                    data-pattern-dot={dot}
                    onClick={() => togglePatternDot(dot)}
                    aria-pressed={active}
                    aria-label={`Pattern dot ${dot}`}
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition',
                      active ? 'border-[#15803D] bg-[#15803D]' : 'border-[#D0D5DD] bg-white hover:border-[#86EFAC]',
                    )}
                  >
                    <span className={cx('h-2.5 w-2.5 rounded-full', active ? 'bg-white' : 'bg-[#D0D5DD]')} />
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs text-[#667085]">
              {patternDots.length ? `Pattern: ${patternDots.join(' → ')}` : 'Drag or tap at least 4 dots in sequence.'}
            </p>
            {patternDots.length > 0 && patternDots.length < 4 ? (
              <p className="text-center text-xs text-red-600">Connect at least 4 dots.</p>
            ) : fieldErrors.devicePin ? (
              <p className="text-center text-xs text-red-600">{fieldErrors.devicePin}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#F0FDF4] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-[#15803D]">Why we need this</p>
          <p className="mt-0.5 text-xs text-[#3F6C55]">
            This helps the service team verify the device status and avoid delays during testing and delivery.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={goNext}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#166534]"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#98A2B3]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
        Encrypted &amp; Secure
      </p>
    </Section>
  );

  /**
   * Device Missing Parts — its own top-nav tab (SECTIONS, above), between
   * Device Security Lock and Add Issue / Service. See MISSING_PART_ITEMS'
   * doc comment for why the per-part breakdown is local state while only
   * the joined missingPartsSummary reaches the real, existing
   * missingDamageParts field in the submit payload.
   */
  const missingPartsSection = (
    <Section title="Device Missing Parts" icon={ListChecks}>
      <p className="-mt-1 mb-4 text-xs text-[#667085]">Inspect and flag the device condition.</p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#EAECF0] bg-white p-3 text-center">
          <p className="text-lg font-extrabold text-[#101828]">{flaggedPartsCount}</p>
          <p className="text-xs text-[#667085]">Parts Flagged</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#EAECF0] bg-[#F0FDF4] p-3 text-center">
          <p className="text-xs font-bold text-[#15803D]">Inspection in progress</p>
        </div>
      </div>

      <div className="space-y-2">
        {MISSING_PART_ITEMS.map((item) => {
          const status = missingParts[item.key];
          const flagged = Boolean(status);
          return (
            <div
              key={item.key}
              className={cx('rounded-xl border p-3.5 transition', flagged ? 'border-[#15803D] bg-[#F0FDF4]' : 'border-[#EAECF0] bg-white')}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    flagged ? 'bg-[#15803D] text-white' : 'bg-[#F0FDF4] text-[#15803D]',
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#101828]">{item.title}</p>
                  <p className="text-xs text-[#667085]">{item.subtitle}</p>
                </div>
                <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', flagged ? 'bg-[#15803D]' : 'bg-[#D0D5DD]')} aria-hidden="true" />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPartStatus(item.key, 'missing')}
                  aria-pressed={status === 'missing'}
                  className={cx(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                    status === 'missing' ? 'border-[#15803D] bg-[#15803D] text-white' : 'border-[#D0D5DD] bg-white text-[#344054] hover:border-[#86EFAC]',
                  )}
                >
                  Missing
                </button>
                <button
                  type="button"
                  onClick={() => setPartStatus(item.key, 'damaged')}
                  aria-pressed={status === 'damaged'}
                  className={cx(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                    status === 'damaged' ? 'border-[#15803D] bg-[#15803D] text-white' : 'border-[#D0D5DD] bg-white text-[#344054] hover:border-[#86EFAC]',
                  )}
                >
                  Damaged
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recap bar, not a second position:sticky element — the shared
          Previous/Next/Confirm footer at the bottom of this page is
          already sticky; stacking a second independent sticky bar at the
          same bottom offset would overlap it rather than stack cleanly.
          This still shows the live count and advances via the same
          goNext() the footer's own Next button uses. */}
      <button
        type="button"
        onClick={goNext}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-[#14532D] px-5 py-3.5 text-left text-white transition hover:bg-[#166534]"
      >
        <span>
          <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-[#DCFCE7]">
            {flaggedPartsCount} Part{flaggedPartsCount === 1 ? '' : 's'} Flagged
          </span>
          <span className="block text-sm font-bold">Review &amp; Submit</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
    </Section>
  );

  const problemSection = (
    <Section title="Add Issue / Service" icon={Wrench}>
      <div className="space-y-3">
        <p className="-mt-1 text-xs text-[#667085]">Select the repair issues or services required for this device.</p>

        {!form.categoryId ? (
          <p className="rounded-lg border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-3 py-4 text-center text-xs text-[#98A2B3]">
            Select a Device Category on the Device Details tab to see the relevant repair options.
          </p>
        ) : relevantRepairCategories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-3 py-4 text-center text-xs text-[#98A2B3]">
            No repair categories are set up for this device category yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 lg:gap-4">
            {relevantRepairCategories.map((c) => (
              <IssueCategoryRow
                key={c.id}
                category={c}
                services={servicesByCategoryId.get(c.id) || []}
                expanded={expandedIssueCategories.includes(c.id)}
                onToggleExpand={() => toggleIssueCategory(c.id)}
                selectedIds={form.serviceIds}
                onToggleService={toggleService}
                isOther={isOtherIssueCategory(c)}
                otherValue={form.issueDescription}
                onOtherChange={(e) => set('issueDescription', e.target.value)}
                draftPrices={draftServicePrices}
                draftWarranty={draftServiceWarranty}
                onDraftPriceChange={setDraftServicePrice}
                onDraftWarrantyChange={setDraftServiceWarrantyMonths}
              />
            ))}
          </div>
        )}

        {chosenServices.length > 0 ? (
          <div className="rounded-xl border border-[#EAECF0] bg-[#F9FAFB] p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-xs font-bold text-[#101828]">
                Selected Services <span className="text-[#15803D]">({chosenServices.length})</span>
              </p>
              {draftServicesSubtotal > 0 ? (
                <p className="text-[0.7rem] text-[#667085]">
                  Services subtotal: <span className="font-bold text-[#101828]">{money(draftServicesSubtotal)}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {chosenServices.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#15803D] bg-white py-1 pl-3 pr-1.5 text-xs font-semibold text-[#15803D]"
                >
                  {s.name}
                  {draftServicePrices[s.id] ? <span className="font-normal text-[#667085]">· ₹{draftServicePrices[s.id]}</span> : null}
                  {draftServiceWarranty[s.id] ? <span className="font-normal text-[#667085]">· {draftServiceWarranty[s.id]}mo warranty</span> : null}
                  <button
                    type="button"
                    onClick={() => toggleService(s.id)}
                    aria-label={`Remove ${s.name}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-[#F0FDF4]"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Section>
  );

  const pickupSection = (
    <Section title="Service Price & Issue Estimate" icon={Receipt} className="space-y-4">
      {/* Bill Details — same real chosenServices/draftServicePrices/toggleService
          this page already collects, restyled as an itemized bill. Each line
          price is entered on the Add Issue / Service tab and summed into the
          real, submitted form.serviceCharge (see the sync effect near
          draftServicesSubtotal); the Estimated Total banner below is that
          same real, submitted totals.total from estimateTotal(). */}
      <div className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAECF0] bg-[#F9FAFB] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#101828]">Bill Details</p>
              <p className="text-xs text-[#667085]">Services selected for this device</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#D0D5DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#344054]">
              {chosenServices.length} item{chosenServices.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={() => setActiveSection('problem')}
              className="inline-flex items-center gap-1 rounded-full bg-[#15803D] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#166534]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add Service
            </button>
          </div>
        </div>

        {chosenServices.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[#98A2B3]">No services selected yet — add one from the Add Issue / Service tab.</p>
        ) : (
          <div className="divide-y divide-dashed divide-[#EAECF0]">
            {chosenServices.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-xs font-bold text-[#15803D]">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#101828]">{s.name}</p>
                  {draftServiceWarranty[s.id] ? <p className="text-xs text-[#667085]">{draftServiceWarranty[s.id]} months warranty (draft)</p> : null}
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#344054]">{draftServicePrices[s.id] ? money(draftServicePrices[s.id]) : '₹0'}</span>
                <button
                  type="button"
                  onClick={() => toggleService(s.id)}
                  aria-label={`Remove ${s.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-[#98A2B3] transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 bg-[#F0FDF4] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-[#101828]">Estimated Total</p>
              <p className="text-[0.7rem] text-[#667085]">Final amount may vary based on parts availability.</p>
            </div>
          </div>
          <span className="shrink-0 text-lg font-extrabold text-[#101828]">{money(totals.total)}</span>
        </div>
      </div>

      {/* Device IMEI — same real form.imei field as Device Details; shown
          again here since this tab is now the estimate/summary step. The
          tip below is just real, static help text (dialing *#06# is a
          genuine phone feature). The "Scan" button is disabled — there's no
          camera/OCR capability anywhere in this app to back it; it's shown
          for layout parity with the reference design, not as a working
          feature (same treatment as Assign/Receipt/Barcode elsewhere in the
          shop dashboard before those got real pages). */}
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="Device IMEI / Serial Number">
              <input
                className={COMPACT_INPUT_CLS}
                value={form.imei}
                onChange={(e) => set('imei', e.target.value)}
                placeholder="Enter 15-digit IMEI"
              />
            </FormField>
          </div>
          <button
            type="button"
            disabled
            title="Camera IMEI scanning isn't available in the shop portal yet"
            className="mb-[3px] inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-[#F9FAFB] px-3.5 py-2.5 text-sm font-bold text-[#98A2B3]"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Scan
          </button>
        </div>
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-[#F0FDF4] px-3 py-2 text-xs text-[#15803D]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Tip: dial *#06# on the device to display the IMEI as a barcode.
        </p>
      </div>

      {/* Issue Description — the same real form.issueDescription field
          this page has always had (previously only reachable through the
          "Other" repair category's textarea on the Add Issue / Service
          tab); given its own card here too, per request, with a 500-char
          counter. Still the one real field, still optional. */}
      <div ref={registerField(fieldRefs, 'issueDescription')} className="rounded-xl border border-[#EAECF0] bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold text-[#101828]">
            <Pencil className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
            Issue Description
          </p>
          <span className="shrink-0 text-xs text-[#98A2B3]">{form.issueDescription.length}/500</span>
        </div>
        <textarea
          className={cx(COMPACT_INPUT_CLS, 'min-h-[90px] resize-y')}
          value={form.issueDescription}
          maxLength={500}
          onChange={(e) => {
            set('issueDescription', e.target.value.slice(0, 500));
            if (fieldErrors.issueDescription) setFieldErrors((prev) => ({ ...prev, issueDescription: undefined }));
          }}
          placeholder="What's wrong with the device? e.g. Screen cracked, battery drains fast…"
        />
        {fieldErrors.issueDescription ? <p className="mt-1.5 text-xs text-red-600">{fieldErrors.issueDescription}</p> : null}
      </div>

      {/* Record Voice Note — a real recorder (see VoiceNoteCard below); no
          fake button any more. */}
      <VoiceNoteCard />

      {/* Estimated Delivery — local planning aid only, see the ReadyByPicker
          doc comment near the top of this file for why it's never
          submitted with the booking. Ready By is now a pure derived value
          (Received + Duration, recomputed on every render — no state of its
          own), so there's no separate "Edit" affordance for it any more:
          Received and Duration are each directly clickable instead. */}
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#101828]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]">
            <Truck className="h-4 w-4" aria-hidden="true" />
          </span>
          Estimated Delivery
        </p>

        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setReceivedPickerOpen(true)}
            className={cx('min-w-[108px] shrink-0 rounded-xl bg-[#F0FDF4] px-3 py-2.5 text-left transition hover:bg-[#DCFCE7]', FOCUS_RING)}
          >
            <p className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-[#667085]">
              <Calendar className="h-3 w-3" aria-hidden="true" /> Received
            </p>
            <p className="mt-1 text-sm font-bold text-[#101828]">{fmtChipDate(draftReceivedAt)}</p>
            <p className="text-xs text-[#667085]">{fmtChipTime(draftReceivedAt)}</p>
          </button>

          <ChevronRight className="my-auto h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setDurationPickerOpen(true)}
            className={cx('min-w-[108px] shrink-0 rounded-xl bg-[#F0FDF4] px-3 py-2.5 text-left transition hover:bg-[#DCFCE7]', FOCUS_RING)}
          >
            <p className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-[#667085]">
              <Timer className="h-3 w-3" aria-hidden="true" /> Duration
            </p>
            <span className="mt-1 flex items-center gap-1 text-sm font-bold text-[#101828]">
              {durationLabel(draftDurationMinutes)}
              <ChevronDown className="h-3 w-3 shrink-0 text-[#98A2B3]" aria-hidden="true" />
            </span>
          </button>

          <ChevronRight className="my-auto h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setReadyByPickerOpen(true)}
            className={cx(
              'min-w-[108px] shrink-0 cursor-pointer rounded-xl bg-[#15803D] px-3 py-2.5 text-left text-white transition hover:bg-[#166534]',
              FOCUS_RING,
            )}
          >
            <p className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-[#DCFCE7]">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Ready By
            </p>
            <p className="mt-1 text-sm font-bold">{fmtChipDate(draftReadyBy)}</p>
            <p className="text-xs text-[#DCFCE7]">{fmtChipTime(draftReadyBy)}</p>
          </button>
        </div>

        <div className="mt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-bold text-[#15803D]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> On time
          </span>
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-[0.7rem] text-[#98A2B3]">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" /> Estimate only — not saved with this booking.
        </p>
      </div>

      {receivedPickerOpen ? (
        <DateTimeSheet
          title="Received"
          description="Pick the date and time the device was received. Ready By follows it."
          confirmLabel="Set received time"
          initialValue={draftReceivedAt}
          onConfirm={(next) => {
            setDraftReceivedAt(next);
            setReceivedPickerOpen(false);
          }}
          onClose={() => setReceivedPickerOpen(false)}
        />
      ) : null}

      {durationPickerOpen ? (
        <DurationSheet
          initialMinutes={draftDurationMinutes}
          onConfirm={(minutes) => {
            setDraftDurationMinutes(minutes);
            setDurationPickerOpen(false);
          }}
          onClose={() => setDurationPickerOpen(false)}
        />
      ) : null}

      {readyByPickerOpen ? (
        <DateTimeSheet
          title="Ready by"
          description="Pick the date and time the device will be ready. Duration is recalculated from it."
          confirmLabel="Set ready by"
          initialValue={draftReadyBy}
          onConfirm={(next) => {
            applyReadyBy(next);
            setReadyByPickerOpen(false);
          }}
          onClose={() => setReadyByPickerOpen(false)}
        />
      ) : null}

      {/* Customer repair approval — local-only reminder checkbox, see the
          customerApproved state declaration above for why it's never
          submitted. */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#EAECF0] bg-white p-4">
        <input
          type="checkbox"
          checked={customerApproved}
          onChange={(e) => setCustomerApproved(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D0D5DD] text-[#15803D] focus:ring-[#15803D]"
        />
        <span>
          <span className="block text-sm font-bold text-[#101828]">Customer repair approval</span>
          <span className="block text-xs text-[#667085]">Customer agreed to the estimated price &amp; timing.</span>
        </span>
      </label>
    </Section>
  );

  /**
   * Device Photos — rebuilt on the Device Information tab per request
   * (a prior redesign removed the old version of this card entirely, but
   * left uploadShopDevicePhoto() in src/lib/shopBooking.js in place for
   * exactly this reason). Front/Back/Damage are single-photo slots;
   * Additional accepts any number. Every upload is a real call to shop
   * media storage with the shop's own bearer token, the same endpoint the
   * public /repair flow's customer-facing photo picker uses — not a mock.
   */
  const devicePhotosSection = (
    <Section title="Device Photos" icon={Camera}>
      <p className="-mt-1 mb-3 text-xs text-[#667085]">Document the device&apos;s condition at intake.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PhotoTile
          label="Front"
          url={form.frontImageUrl}
          uploading={Boolean(photoUploading.front)}
          error={photoError.front}
          onUpload={(file) => handlePhotoUpload('front', file)}
          onRemove={() => removePhoto('front')}
        />
        <PhotoTile
          label="Back"
          url={form.backImageUrl}
          uploading={Boolean(photoUploading.back)}
          error={photoError.back}
          onUpload={(file) => handlePhotoUpload('back', file)}
          onRemove={() => removePhoto('back')}
        />
        <PhotoTile
          label="Damage"
          url={form.damageImageUrl}
          uploading={Boolean(photoUploading.damage)}
          error={photoError.damage}
          onUpload={(file) => handlePhotoUpload('damage', file)}
          onRemove={() => removePhoto('damage')}
        />
        <PhotoTile
          label={`Additional${form.additionalImageUrls.length ? ` (${form.additionalImageUrls.length})` : ''}`}
          url={null}
          uploading={Boolean(photoUploading.additional)}
          error={photoError.additional}
          onUpload={(file) => handlePhotoUpload('additional', file)}
        />
      </div>

      {form.additionalImageUrls.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {form.additionalImageUrls.map((url) => (
            <div key={url} className="relative overflow-hidden rounded-xl border border-[#EAECF0]">
              {/* eslint-disable-next-line @next/next/no-img-element -- shop-uploaded device photo, remote media URL. */}
              <img src={url} alt="Additional device photo" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAdditionalPhoto(url)}
                aria-label="Remove additional photo"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );

  /**
   * Service Booking Devices List — 8th of 9 tabs (Booking Confirmation is
   * now the true last one), a booking review screen built entirely from
   * state the earlier tabs already collected (see bookingDevices' doc
   * comment above). "+ Add another device" is disabled: this client's
   * booking form is a single flat object, not an array of devices, so real
   * multi-device support would mean restructuring every earlier tab's
   * state — a much bigger change than this section on its own, and not one
   * to make silently as a side effect of a review screen. Its own "Submit
   * Booking" bar calls the exact same submit() the shared step footer's
   * "Confirm Booking" button does on this same tab — not a second,
   * parallel submission path — and submit() itself navigates to the
   * confirmation tab on success.
   */
  const bookingDevicesSection = (
    <Section title="Service Booking Devices List" icon={ClipboardList}>
      <p className="-mt-1 mb-4 text-xs text-[#667085]">Review customer devices and services.</p>

      <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#EAECF0] bg-white p-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]">
          <User className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Customer</p>
          <p className="truncate text-sm font-bold text-[#101828]">{form.customerName || 'Not provided'}</p>
          <p className="truncate text-xs text-[#667085]">{form.customerMobile || 'Not provided'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#15803D]">Verified</span>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#667085]">Devices in this Booking</p>
        <span className="shrink-0 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-bold text-[#15803D]">
          {bookingDevices.length} Device{bookingDevices.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {bookingDevices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-3 py-6 text-center text-xs text-[#98A2B3]">
            No device selected yet — pick a brand and model on the Device Details tab.
          </p>
        ) : (
          bookingDevices.map((d, idx) => (
            <div key={idx} className="rounded-xl border border-[#EAECF0] bg-white p-3.5">
              <div className="flex items-start gap-3">
                <Thumb url={d.image} name={d.model || d.brand} size="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#101828]">
                    {[d.brand, d.model].filter(Boolean).join(' ') || 'Device not specified'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {d.brand ? (
                      <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[0.65rem] font-bold text-[#15803D]">{d.brand}</span>
                    ) : null}
                    {d.modelCode ? (
                      <span className="rounded-full bg-[#F9FAFB] px-2 py-0.5 text-[0.65rem] font-bold text-[#344054] ring-1 ring-[#EAECF0]">
                        {d.modelCode}
                      </span>
                    ) : null}
                    {d.isPrimary ? (
                      <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[0.65rem] font-bold text-[#15803D]">Primary Device</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-dashed border-[#EAECF0] pt-3">
                <p className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">
                  Repair Services ({d.selectedServices.length})
                </p>
                {d.selectedServices.length ? (
                  <ul className="space-y-1">
                    {d.selectedServices.map((s, i) => (
                      <li key={s.id || i} className="flex items-center gap-2 text-sm text-[#344054]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[0.6rem] font-bold text-[#15803D]">
                          {i + 1}
                        </span>
                        {s.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#98A2B3]">No services selected yet.</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F0FDF4] px-3 py-2.5">
                <span className="text-xs font-bold text-[#15803D]">Estimated repair amount</span>
                <span className="text-sm font-extrabold text-[#101828]">{money(d.estimatedAmount)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        disabled
        title="Multiple devices per booking aren't supported in the shop portal yet"
        className="mt-3 flex w-full cursor-not-allowed flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-4 py-4 text-center"
      >
        <span className="flex items-center gap-1.5 text-sm font-bold text-[#98A2B3]">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add another device
        </span>
        <span className="text-xs text-[#98A2B3]">Same customer? Book multiple devices under one go.</span>
      </button>

      <div className="mt-5 rounded-xl border border-[#EAECF0] bg-white p-4">
        <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wide text-[#667085]">Bill Summary</p>
        <div className="space-y-2">
          {bookingDevices.map((d, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-[#344054]">
                {[d.brand, d.model].filter(Boolean).join(' ') || 'Device'}
                <span className="ml-1.5 text-xs text-[#98A2B3]">
                  ({d.selectedServices.length} service{d.selectedServices.length === 1 ? '' : 's'})
                </span>
              </span>
              <span className="font-bold text-[#101828]">{money(d.estimatedAmount)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#EAECF0] pt-3">
          <span className="text-sm font-bold text-[#101828]">Grand Total</span>
          <span className="text-lg font-extrabold text-[#15803D]">{money(grandTotal)}</span>
        </div>
        <p className="mt-2 text-[0.7rem] text-[#98A2B3]">Final amount may vary slightly based on parts availability and inspection.</p>
      </div>

      <div className="mt-5 rounded-xl border border-[#EAECF0] bg-white p-4">
        <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wide text-[#667085]">Payment</p>
        <FormField label="Payment Mode">
          <select className={COMPACT_INPUT_CLS} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            <option value="">Select payment mode</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </FormField>
        <p className="mt-2 text-xs text-[#98A2B3]">Pick a mode to record money collected now. Leave it blank if the customer pays on delivery.</p>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl bg-[#14532D] px-5 py-3.5 text-left text-white transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span>
          <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-[#DCFCE7]">
            Grand Total · {bookingDevices.length} Device{bookingDevices.length === 1 ? '' : 's'}
          </span>
          <span className="block text-lg font-extrabold">{money(grandTotal)}</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
          {submitting ? 'Submitting…' : 'Submit Booking'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
    </Section>
  );

  /**
   * Booking Confirmation — the 9th and true last tab. Gated on `confirmed`
   * itself (set only by a real successful submit(), never speculatively):
   * before that it shows a plain "nothing submitted yet" state rather than
   * a fake success screen, even if someone taps straight to this tab.
   * "Share Receipt"/"Barcode Print" link to the real, already-built
   * Receipt/QR pages for this booking id — genuinely reused, not
   * reimplemented — but createShopBooking() is still a stub (see
   * shopBooking.js), so confirmed.id is a locally-generated placeholder,
   * not a real backend id yet; those links will 404 gracefully (both pages
   * already handle a missing booking) until a real create-booking endpoint
   * replaces the stub. "Assign Technician" is disabled — no technician-
   * assignment endpoint exists anywhere in this client either, same as
   * every other "Assign" button already in this codebase.
   */
  const confirmationSection = (
    <Section title="Booking Confirmation" icon={CheckCircle2}>
      {!confirmed ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#98A2B3]">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-[#344054]">No booking submitted yet</p>
          <p className="max-w-xs text-xs text-[#98A2B3]">
            Complete the previous steps and submit from Service Booking Devices List to see your confirmation here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top success area — visual only, same data/handler as before */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#DCFCE7] via-[#F0FDF4] to-white px-6 py-9 text-center">
            <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#86EFAC]/40 blur-2xl" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#BBF7D0]/40 blur-2xl" aria-hidden="true" />
            <span className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_10px_28px_rgba(21,128,61,0.25)] ring-4 ring-white">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#15803D] text-white">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </span>
            </span>
            <h3 className="relative text-2xl font-extrabold text-[#101828]">Thank You!</h3>
            <p className="relative mt-1 text-sm font-medium text-[#3F6C55]">Your booking has been placed.</p>
            <button
              type="button"
              onClick={copyTrackingId}
              className="relative mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#15803D] shadow-[0_2px_10px_rgba(21,128,61,0.18)] ring-1 ring-[#DCFCE7] transition hover:shadow-[0_4px_16px_rgba(21,128,61,0.28)]"
            >
              #{confirmed.bookingNumber}
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {trackingCopied ? 'Copied' : ''}
            </button>
          </div>

          {/* Customer Details — same fields/values, richer card chrome */}
          <div className="overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.06)]">
            <div className="flex items-center gap-2.5 border-b border-[#EAECF0] bg-[#F7FDFA] px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                <User className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-[#101828]">Customer Details</p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Shop Name</p>
                <p className="mt-0.5 font-bold text-[#101828]">{shopLocation?.name || profile?.name || 'Not available'}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Shop Number</p>
                <p className="mt-0.5 font-bold text-[#101828]">{profile?.phone || 'Not available'}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Customer Name</p>
                <p className="mt-0.5 font-bold text-[#101828]">{confirmed.customerName || 'Not available'}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Mobile Number</p>
                <p className="mt-0.5 font-bold text-[#101828]">{confirmed.customerMobile || 'Not available'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Address</p>
                <p className="mt-0.5 font-bold text-[#101828]">{shopAddress || 'Not available'}</p>
              </div>
            </div>
          </div>

          {/* Device & Repair Details — same data, styled image box + tag pills for services */}
          <div className="overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.06)]">
            <div className="flex items-center gap-2.5 border-b border-[#EAECF0] bg-[#F7FDFA] px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-[#101828]">Device &amp; Repair Details</p>
            </div>
            <div className="flex items-start gap-4 p-4">
              <span className="shrink-0 overflow-hidden rounded-2xl border border-[#DCFCE7] bg-[#F7FDFA] p-1.5">
                <Thumb url={selectedModel?.imageUrl || selectedBrand?.imageUrl} name={confirmed.modelName} size="h-14 w-14" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Device</p>
                <p className="text-base font-extrabold text-[#101828]">
                  {[confirmed.brandName, confirmed.modelName].filter(Boolean).join(' ') || 'Not specified'}
                </p>
                <p className="mt-2.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Repair Services</p>
                {chosenServices.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {chosenServices.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-bold text-[#15803D] ring-1 ring-[#DCFCE7]"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[#98A2B3]">Not specified</p>
                )}
              </div>
            </div>
          </div>

          {/* Service Information — same 4 values, shown as colored stat tiles */}
          <div className="overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.06)]">
            <div className="flex items-center gap-2.5 border-b border-[#EAECF0] bg-[#F7FDFA] px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                <Receipt className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-[#101828]">Service Information</p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F9FAFB] p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Tracking ID</p>
                <p className="mt-1 text-sm font-extrabold text-[#101828]">#{confirmed.bookingNumber}</p>
              </div>
              <div className="rounded-xl bg-[#F9FAFB] p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Status</p>
                <span className="mt-1 inline-block rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#15803D]">
                  {{ CREATED: 'Order Placed' }[confirmed.status] || confirmed.status}
                </span>
              </div>
              <div className="rounded-xl bg-[#F0FDF4] p-3 ring-1 ring-[#DCFCE7]">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#15803D]">Estimated Repair Price</p>
                <p className="mt-1 text-lg font-extrabold text-[#101828]">{money(confirmed.pricing?.estimatedAmount)}</p>
              </div>
              <div className="rounded-xl bg-[#F0FDF4] p-3 ring-1 ring-[#DCFCE7]">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#15803D]">Estimated Delivery</p>
                <p className="mt-1 text-sm font-extrabold text-[#101828]">
                  {fmtChipDate(draftReadyBy)} · {fmtChipTime(draftReadyBy)}
                </p>
              </div>
            </div>
          </div>

          {/* Booking confirmed status banner */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#86EFAC] bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] p-4 shadow-[0_2px_12px_rgba(21,128,61,0.12)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#15803D] text-white shadow-[0_4px_12px_rgba(21,128,61,0.35)]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-extrabold text-[#15803D]">Booking confirmed!</p>
              <p className="text-xs font-medium text-[#3F6C55]">Your request is ready for technician assignment.</p>
            </div>
          </div>

          {/* Action cards — same 3 actions/links, premium tile styling */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled
              title="Technician assignment isn't available in the shop portal yet"
              className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-4 text-center opacity-80"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#98A2B3] shadow-sm">
                <UserCog className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-[#98A2B3]">Assign Technician</span>
              <span className="text-xs text-[#98A2B3]">Assign technician to repair</span>
            </button>
            <Link
              href={`/shop-home/services/bookings/${confirmed.id}/receipt`}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-[#166534] to-[#14532D] p-4 text-center text-white shadow-[0_6px_16px_rgba(20,83,45,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(20,83,45,0.4)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
                <Share2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold">Share Receipt</span>
              <span className="text-xs text-white/75">Share booking details</span>
            </Link>
            <Link
              href={`/shop-home/services/bookings/${confirmed.id}/qr`}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-[#166534] to-[#14532D] p-4 text-center text-white shadow-[0_6px_16px_rgba(20,83,45,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(20,83,45,0.4)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
                <QrCode className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold">Barcode Print</span>
              <span className="text-xs text-white/75">Print booking label</span>
            </Link>
          </div>

          {/* Bottom buttons — same actions/hrefs, pill hierarchy */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className={cx(
                'rounded-full border-2 border-[#D0D5DD] bg-white px-6 py-2.5 text-sm font-bold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]',
                FOCUS_RING,
              )}
            >
              Create another booking
            </button>
            <Link
              href="/shop-home/services/bookings"
              className={cx(
                'rounded-full bg-[#15803D] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(21,128,61,0.35)] transition hover:bg-[#166534]',
                FOCUS_RING,
              )}
            >
              View bookings
            </Link>
          </div>
        </div>
      )}
    </Section>
  );

  const sectionContent = {
    customer: (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {customerSection}
        {addressSection}
      </div>
    ),
    device: deviceSection,
    problem: problemSection,
    pickup: pickupSection,
    deviceInfo: (
      <>
        {deviceInfoSection}
        {pickupSection}
        {devicePhotosSection}
      </>
    ),
    deviceSecurity: deviceSecuritySection,
    missingParts: missingPartsSection,
    devicesList: bookingDevicesSection,
    confirmation: confirmationSection,
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      {/* Hero — soft mint gradient banner with abstract waves + a decorative
          device/repair-tools illustration on the far right, matching a
          reference design's "Book Service" header. Purely visual; the title,
          subtitle and both action buttons are the exact same content/
          handlers this page always had. */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E4EFEB] bg-gradient-to-br from-[#F0FBF5] via-white to-[#EAF5FF] p-5 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)] sm:p-7">
        <span className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#86EFAC]/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-[#93C5FD]/20 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full text-[#E4F8EC]/60"
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,40 C120,90 280,0 500,50 L500,80 L0,80 Z" />
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-4 md:pr-[160px]">
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#10213D] sm:text-[34px]">Book Service</h1>
            <p className="mt-1 text-sm text-[#6B7890]">Create a new repair or service booking.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/shop-home/services/customers"
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border border-[#E4EFEB] bg-white px-4 py-2.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#0A8F4B] hover:text-[#0A8F4B]',
                FOCUS_RING,
              )}
            >
              <History className="h-4 w-4 text-[#0A8F4B]" aria-hidden="true" />
              Customer History
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border border-[#E4EFEB] bg-white px-4 py-2.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#0A8F4B] hover:text-[#0A8F4B]',
                FOCUS_RING,
              )}
            >
              <RotateCcw className="h-4 w-4 text-[#0A8F4B]" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-4 hidden h-[130px] w-[170px] md:block lg:right-8 lg:h-[150px] lg:w-[200px]">
          <BookServiceIllustration />
        </div>
      </div>

      {profileError ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{profileError}</span>
        </div>
      ) : null}

      {/* Step progress — one large white rounded container, each step a rich
          tile (number circle + icon + title + subtitle), chevrons between,
          matching a reference design's 4-step progress bar. There are 9 real
          steps here (not 4 — every existing tab is kept, none removed), so
          the row scrolls horizontally with a hidden scrollbar past the
          viewport width, same technique as before this redesign. */}
      <div className="rounded-[22px] border border-[#E4EFEB] bg-white p-3 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)]">
        <div
          className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onWheel={(e) => {
            // Lets a plain (non-Shift) mouse wheel scroll this row
            // horizontally too, not just Shift+wheel/trackpad — only when
            // there's actually somewhere to scroll, and only takes over
            // vertical wheel motion (a trackpad's native horizontal swipe,
            // e.buttonwheel deltaX, is left alone).
            const el = e.currentTarget;
            if (el.scrollWidth <= el.clientWidth) return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              el.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
        >
          {SECTIONS.map((s, i) => {
            const active = activeSection === s.key;
            return (
              <div key={s.key} className="flex shrink-0 items-center">
                <button
                  ref={(el) => {
                    tabRefs.current[s.key] = el;
                  }}
                  type="button"
                  onClick={() => handleTabClick(s.key)}
                  aria-current={active ? 'step' : undefined}
                  className={cx(
                    'flex h-[64px] w-[15.5rem] shrink-0 items-center gap-3 rounded-2xl px-3.5 text-left transition',
                    FOCUS_RING,
                    active
                      ? 'bg-gradient-to-br from-[#E4F8EC] to-[#F0FBF5] shadow-[inset_0_0_0_1px_rgba(10,143,75,0.15)]'
                      : 'bg-white hover:bg-[#F8FBFA]',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      active ? 'bg-[#066837] text-white' : 'bg-[#F0F4F2] text-[#98A2B3]',
                    )}
                  >
                    {i + 1}
                  </span>
                  {active ? <Icon3D icon={s.icon} tone="green" size="sm" /> : <s.icon className="h-5 w-5 shrink-0 text-[#10213D]" aria-hidden="true" />}
                  <span className="min-w-0">
                    <span className={cx('block truncate text-sm font-bold', active ? 'text-[#10213D]' : 'text-[#344054]')}>{s.label}</span>
                    <span className={cx('block truncate text-xs', active ? 'text-[#0A8F4B]' : 'text-[#98A2B3]')}>{s.subtitle}</span>
                  </span>
                </button>
                {i < SECTIONS.length - 1 ? <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-[#D0D5DD]" aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      <div className="space-y-4">
        {sectionContent[activeSection]}

        {submitError ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        ) : null}
      </div>

      {/* Step footer — Previous / Next, or Confirm Booking on the last tab */}
      <div className="sticky bottom-4 z-10 overflow-hidden rounded-[20px] border border-[#E4EFEB] bg-white/95 p-4 shadow-[0_12px_32px_rgba(20,80,55,0.1),0_3px_10px_rgba(20,80,55,0.05)] backdrop-blur">
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full text-[#E4F8EC]/60"
          viewBox="0 0 500 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,20 C120,40 280,0 500,25 L500,40 L0,40 Z" />
        </svg>
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon3D icon={Receipt} tone="green" size="md" />
            <div>
              <p className="text-xs font-semibold text-[#6B7890]">Estimated Total</p>
              <p className="text-lg font-extrabold text-[#10213D]">{money(totals.total)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                className={cx(
                  'rounded-xl border border-[#DFE9E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]',
                  FOCUS_RING,
                )}
              >
                Previous
              </button>
            ) : null}
            {activeSection === 'confirmation' ? null : activeSection === 'devicesList' ? (
              // The submit-triggering tab is devicesList specifically, not
              // just "whichever tab is last" (confirmation is now last, and
              // has nothing left to confirm) — this button and devicesList's
              // own "Submit Booking" bar both call the exact same submit(),
              // never two different code paths.
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className={cx(
                  'inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#16B45F] to-[#087A3E] px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(8,122,62,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {submitting ? 'Creating booking…' : 'Confirm Booking'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-[#16B45F] to-[#087A3E] px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(8,122,62,0.3)] transition hover:brightness-105',
                  FOCUS_RING,
                )}
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
