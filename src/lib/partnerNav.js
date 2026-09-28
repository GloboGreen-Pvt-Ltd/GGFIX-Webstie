/**
 * partnerNav.js — single source of truth for the GGFIX Partner Dashboard
 * navigation (sidebar, breadcrumbs, page titles). Every route under
 * /shop-home/* is either the Dashboard itself or a leaf item listed here.
 *
 * Leaf items without a real page yet (i.e. almost all of them — see the
 * catch-all at src/app/shop-home/[...slug]/page.js) render an honest
 * "Coming soon" state rather than fake data or a dead link. When a real
 * page is built at one of these paths, Next.js gives it routing priority
 * over the catch-all automatically — nothing here needs to change.
 *
 * Route stability: every `slug` below is unchanged from before this file's
 * 2026-09 sidebar redesign, even where the requested IA used a different
 * path (e.g. a flat `/shop-home/employees/*` instead of the existing
 * `/shop-home/employee/*`, or `/shop-home/dashboard` instead of the
 * existing `/shop-home` root). Renaming a slug here would 404 every
 * bookmark/link to it and, for the four real pages (book-service, pickups,
 * employee/team, account/business-profile, account/settings), break actual
 * shipped functionality — so this redesign only ever changes labels, icons,
 * descriptions, grouping and order, never a slug a real or stub page
 * already answers to.
 *
 * "Shop Profile" and "Business Settings" (the `settings` section's first
 * two items) are the same two routes the profile dropdown has always linked
 * to (`account/business-profile`, `account/settings`) — they used to be
 * reachable ONLY from there ("ACCOUNT_ITEMS", not shown in the sidebar).
 * The 2026-09 redesign surfaces them in the sidebar's new Settings section
 * too, so they are defined once, right here, and both places point at the
 * same two objects — see accountProfileItem/accountSettingsItem below.
 */

import {
  Bell,
  BarChart3,
  Calendar,
  CalendarCheck,
  Clock,
  CreditCard,
  FileText,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

export const DASHBOARD_ITEM = {
  key: 'dashboard',
  label: 'Dashboard',
  href: '/shop-home',
  icon: LayoutDashboard,
  description: 'Business overview — bookings, revenue, service activity, employee activity and alerts.',
};

// Reused by both the sidebar's Settings section and, unchanged, wherever
// else account-menu destinations are surfaced — one definition, not two.
const accountProfileItem = {
  key: 'business-profile',
  label: 'Business Profile',
  slug: 'account/business-profile',
  icon: Store,
  description: 'Your shop/business information.',
};
const accountSettingsItem = {
  key: 'account-settings',
  label: 'Account Settings',
  slug: 'account/settings',
  icon: Settings,
  description: 'Account preferences and security settings.',
};

export const PARTNER_NAV = [
  {
    key: 'services',
    label: 'Services',
    icon: Wrench,
    items: [
      { key: 'book-service', label: 'Book Service', slug: 'services/book-service', icon: PlusCircle, description: 'Create a new repair/service booking.' },
      { key: 'requote', label: 'Requote', slug: 'services/requote', icon: FileText, description: 'Manage bookings that require revised quotations.' },
      { key: 'pickups', label: 'Pickups', slug: 'services/pickups', icon: Truck, description: 'Track and manage device pickup bookings.' },
      { key: 'bookings', label: 'Bookings', slug: 'services/bookings', icon: ListChecks, description: 'View and manage all repair and service bookings.' },
      { key: 'customers', label: 'Customers', slug: 'services/customers', icon: Users, description: 'Manage customer profiles, contact information, booking history and service records.' },
      { key: 'enquiries', label: 'Enquiries', slug: 'services/enquiries', icon: MessageSquare, description: 'Manage customer enquiries and convert them into service bookings.' },
      { key: 'model-compatibility', label: 'Model Compatibility', slug: 'services/model-compatibility', icon: Smartphone, description: 'Check and manage device models and supported repair/service compatibility.' },
      { key: 'service-status', label: 'Service Status', slug: 'services/service-status', icon: Clock, description: 'Track the current progress and status of active repair services.' },
      { key: 'delivery', label: 'Delivery', slug: 'services/delivery', icon: Package, description: 'Manage completed repairs that are ready for delivery or return to customers.' },
      { key: 'warranty', label: 'Warranty / Rework', slug: 'services/warranty', icon: ShieldCheck, description: 'Manage warranty claims, repeat repair requests and rework jobs.' },
    ],
  },
  {
    key: 'employee',
    label: 'Employee',
    icon: Users,
    items: [
      { key: 'team', label: 'Employee Management', slug: 'employee/team', icon: Users, description: 'View, add, edit, activate, deactivate and manage employees.' },
      { key: 'attendance', label: 'Attendance', slug: 'employee/attendance', icon: CalendarCheck, description: 'Monitor employee attendance, late check-ins, permissions and leaves.' },
      { key: 'leave', label: 'Leave Management', slug: 'employee/leave', icon: Calendar, description: 'View, approve, reject and manage employee leave requests.' },
      { key: 'shift-schedule', label: 'Shift Management', slug: 'employee/shift-schedule', icon: Clock, description: 'View employee work schedules and check-in/check-out details.' },
      { key: 'salary', label: 'Salary & Payslips', slug: 'employee/salary', icon: IndianRupee, description: 'Manage salary records, advances, monthly salary reports and payslips.' },
      { key: 'service-report', label: 'Service Report', slug: 'employee/service-report', icon: BarChart3, description: 'Monitor technician work records and assigned service tasks.' },
      { key: 'pickup-report', label: 'Pickup Report', slug: 'employee/pickup-report', icon: Truck, description: 'Monitor pickup person assignments and completed pickups.' },
      { key: 'tasks', label: 'Tasks', slug: 'employee/tasks', icon: ListChecks, description: 'Assign and track employee tasks.' },
      { key: 'permissions', label: 'Permissions', slug: 'employee/permissions', icon: ShieldCheck, description: 'Manage short-time employee permission requests.' },
      { key: 'performance', label: 'Performance', slug: 'employee/performance', icon: BarChart3, description: 'Monitor employee productivity and performance.' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { key: 'overview', label: 'Business Overview', slug: 'reports/overview', icon: LayoutDashboard, description: 'Total bookings, revenue, completed/pending services and customer growth.' },
      { key: 'revenue', label: 'Revenue Report', slug: 'reports/revenue', icon: IndianRupee, description: 'Daily, weekly and monthly revenue, pending payments and payment methods.' },
      { key: 'reports-service-report', label: 'Service Report', slug: 'reports/service-report', icon: BarChart3, description: 'Service status, technician performance, completion rate and average repair time.' },
      { key: 'employee-report', label: 'Employee Report', slug: 'reports/employee-report', icon: Users, description: 'Attendance, productivity, completed tasks and leave statistics.' },
      { key: 'reports-pickup-report', label: 'Pickup Report', slug: 'reports/pickup-report', icon: Truck, description: 'Total, completed and pending pickups, and pickup employee performance.' },
      { key: 'cash-book', label: 'Cash Book', slug: 'reports/cash-book', icon: Wallet, description: 'Manage cash-in and cash-out records.' },
      { key: 'booking-report', label: 'Booking Report', slug: 'reports/booking-report', icon: ListChecks, description: 'View booking statistics and trends.' },
      { key: 'delivery-report', label: 'Delivery Report', slug: 'reports/delivery-report', icon: Package, description: 'View delivered-device statistics.' },
      { key: 'customer-report', label: 'Customer Report', slug: 'reports/customer-report', icon: Users, description: 'View customer activity and service history.' },
      { key: 'sales-report', label: 'Sales Report', slug: 'reports/sales-report', icon: ShoppingBag, description: 'View Buy/Sell transaction reports.' },
      { key: 'expense-report', label: 'Expense Report', slug: 'reports/expense-report', icon: IndianRupee, description: 'Track business expenses.' },
      { key: 'payment-report', label: 'Payment Report', slug: 'reports/payment-report', icon: CreditCard, description: 'Analyze payment methods and transaction details.' },
      { key: 'profit-loss', label: 'Profit & Loss', slug: 'reports/profit-loss', icon: BarChart3, description: 'Compare business income against expenses.' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      accountProfileItem,
      accountSettingsItem,
      { key: 'subscription', label: 'Subscription & Plan', slug: 'settings/subscription', icon: CreditCard, description: 'Manage subscription, employee seat limits and billing.' },
      { key: 'notifications', label: 'Notifications', slug: 'settings/notifications', icon: Bell, description: 'Manage notification preferences.' },
    ],
  },
];

/** Every leaf item, each with its full href attached — flattened once for lookups. */
export const PARTNER_NAV_FLAT = PARTNER_NAV.flatMap((section) =>
  section.items.map((item) => ({ ...item, href: `/shop-home/${item.slug}`, section })),
);

/** Every slug the catch-all route ([...slug]) must pre-render under output:'export'. */
export const ALL_STUB_SLUGS = PARTNER_NAV_FLAT.map((item) => item.slug);

/**
 * Resolve the current pathname to { title, breadcrumb, sectionKey }.
 * sectionKey tells the sidebar which section to keep expanded.
 */
export function resolveNavContext(pathname) {
  const clean = String(pathname || '').replace(/\/+$/, '') || '/shop-home';

  if (clean === '/shop-home') {
    return { title: 'Dashboard', breadcrumb: ['Dashboard'], sectionKey: null };
  }

  const match = PARTNER_NAV_FLAT.find((item) => item.href === clean);
  if (match) {
    return {
      title: match.label,
      breadcrumb: [match.section.label, match.label],
      sectionKey: match.section.key,
    };
  }

  return { title: 'Dashboard', breadcrumb: ['Dashboard'], sectionKey: null };
}

/** Find a leaf item by its slug array (from the catch-all route params). */
export function findNavItemBySlug(slugParts) {
  const slug = Array.isArray(slugParts) ? slugParts.join('/') : String(slugParts || '');
  return PARTNER_NAV_FLAT.find((item) => item.slug === slug) || null;
}
