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
 */

import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
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
  User,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

export const DASHBOARD_ITEM = {
  key: 'dashboard',
  label: 'Dashboard',
  href: '/shop-home',
  icon: LayoutDashboard,
};

export const PARTNER_NAV = [
  {
    key: 'services',
    label: 'Services',
    icon: Wrench,
    items: [
      { key: 'book-service', label: 'Book Service', slug: 'services/book-service', icon: PlusCircle, description: 'Create a new repair/service booking.' },
      { key: 'requote', label: 'Requote', slug: 'services/requote', icon: FileText, description: 'Update or revise an existing service quotation.' },
      { key: 'pickups', label: 'Pickups', slug: 'services/pickups', icon: Truck, description: 'Manage pickup requests.' },
      { key: 'bookings', label: 'Bookings', slug: 'services/bookings', icon: ClipboardList, description: 'View and manage all service bookings.' },
      { key: 'customers', label: 'Customers', slug: 'services/customers', icon: Users, description: 'Manage customer details and service history.' },
      { key: 'enquiries', label: 'Enquiries', slug: 'services/enquiries', icon: MessageSquare, description: 'View and manage customer enquiries.' },
      { key: 'model-compatibility', label: 'Model Compatibility', slug: 'services/model-compatibility', icon: Smartphone, description: 'Check supported device/model services and compatibility.' },
      { key: 'service-status', label: 'Service Status', slug: 'services/service-status', icon: Clock, description: 'Track repair and service progress.' },
      { key: 'delivery', label: 'Delivery', slug: 'services/delivery', icon: Package, description: 'Manage devices ready for delivery and completed deliveries.' },
      { key: 'warranty', label: 'Warranty / Rework', slug: 'services/warranty', icon: ShieldCheck, description: 'Manage warranty claims, rework jobs and repeat-repair cases.' },
    ],
  },
  {
    key: 'employee',
    label: 'Employee',
    icon: Users,
    items: [
      { key: 'team', label: 'Team', slug: 'employee/team', icon: Users, description: 'View and manage employees.' },
      { key: 'attendance', label: 'Attendance', slug: 'employee/attendance', icon: CheckCircle2, description: 'Manage daily employee attendance.' },
      { key: 'service-report', label: 'Service Report', slug: 'employee/service-report', icon: BarChart3, description: 'View employee-wise service activity.' },
      { key: 'pickup-report', label: 'Pickup Report', slug: 'employee/pickup-report', icon: Truck, description: 'View employee pickup activity.' },
      { key: 'tasks', label: 'Tasks', slug: 'employee/tasks', icon: ListChecks, description: 'Assign and track employee tasks.' },
      { key: 'shift-schedule', label: 'Shift Schedule', slug: 'employee/shift-schedule', icon: Calendar, description: 'Manage employee shift schedules.' },
      { key: 'leave', label: 'Leave', slug: 'employee/leave', icon: Clock, description: 'Manage leave requests and approvals.' },
      { key: 'permissions', label: 'Permissions', slug: 'employee/permissions', icon: ShieldCheck, description: 'Manage short-time employee permission requests.' },
      { key: 'performance', label: 'Performance', slug: 'employee/performance', icon: BarChart3, description: 'Monitor employee productivity and performance.' },
      { key: 'salary', label: 'Salary', slug: 'employee/salary', icon: IndianRupee, description: 'View salary and payment information.' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { key: 'revenue', label: 'Revenue', slug: 'reports/revenue', icon: IndianRupee, description: 'View revenue overview.' },
      { key: 'reports-service-report', label: 'Service Report', slug: 'reports/service-report', icon: BarChart3, description: 'Analyze bookings and repair performance.' },
      { key: 'cash-book', label: 'Cash Book', slug: 'reports/cash-book', icon: Wallet, description: 'Manage cash-in and cash-out records.' },
      { key: 'booking-report', label: 'Booking Report', slug: 'reports/booking-report', icon: ClipboardList, description: 'View booking statistics and trends.' },
      { key: 'reports-pickup-report', label: 'Pickup Report', slug: 'reports/pickup-report', icon: Truck, description: 'Analyze pickup performance.' },
      { key: 'delivery-report', label: 'Delivery Report', slug: 'reports/delivery-report', icon: Package, description: 'View delivered-device statistics.' },
      { key: 'employee-report', label: 'Employee Report', slug: 'reports/employee-report', icon: Users, description: 'Analyze employee productivity and activity.' },
      { key: 'customer-report', label: 'Customer Report', slug: 'reports/customer-report', icon: Users, description: 'View customer activity and service history.' },
      { key: 'sales-report', label: 'Sales Report', slug: 'reports/sales-report', icon: ShoppingBag, description: 'View Buy/Sell transaction reports.' },
      { key: 'expense-report', label: 'Expense Report', slug: 'reports/expense-report', icon: IndianRupee, description: 'Track business expenses.' },
      { key: 'payment-report', label: 'Payment Report', slug: 'reports/payment-report', icon: CreditCard, description: 'Analyze payment methods and transaction details.' },
      { key: 'profit-loss', label: 'Profit & Loss', slug: 'reports/profit-loss', icon: BarChart3, description: 'Compare business income against expenses.' },
    ],
  },
];

/**
 * The profile-dropdown destinations (My Profile / Business Profile /
 * Account Settings). Not shown in the sidebar, but routed through the same
 * catch-all + ComingSoon pattern as every other unbuilt destination — see
 * findNavItemBySlug below.
 */
export const ACCOUNT_ITEMS = [
  { key: 'my-profile', label: 'My Profile', slug: 'account/profile', icon: User, description: 'Your personal partner-account details.' },
  { key: 'business-profile', label: 'Business Profile', slug: 'account/business-profile', icon: Store, description: 'Your shop/business information.' },
  { key: 'account-settings', label: 'Account Settings', slug: 'account/settings', icon: Settings, description: 'Account preferences and security settings.' },
];

/** Every leaf item, each with its full href attached — flattened once for lookups. */
export const PARTNER_NAV_FLAT = PARTNER_NAV.flatMap((section) =>
  section.items.map((item) => ({ ...item, href: `/shop-home/${item.slug}`, section })),
);

const ACCOUNT_ITEMS_WITH_HREF = ACCOUNT_ITEMS.map((item) => ({ ...item, href: `/shop-home/${item.slug}` }));

/** Every slug the catch-all route ([...slug]) must pre-render under output:'export'. */
export const ALL_STUB_SLUGS = [...PARTNER_NAV_FLAT, ...ACCOUNT_ITEMS_WITH_HREF].map((item) => item.slug);

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

  // Not a sidebar item — check the account-menu destinations (My Profile,
  // Business Profile, Account Settings) so the navbar title/breadcrumb is
  // still correct for real pages under /shop-home/account/*.
  const accountMatch = ACCOUNT_ITEMS_WITH_HREF.find((item) => item.href === clean);
  if (accountMatch) {
    return { title: accountMatch.label, breadcrumb: [accountMatch.label], sectionKey: null };
  }

  return { title: 'Dashboard', breadcrumb: ['Dashboard'], sectionKey: null };
}

/** Find a leaf item by its slug array (from the catch-all route params). */
export function findNavItemBySlug(slugParts) {
  const slug = Array.isArray(slugParts) ? slugParts.join('/') : String(slugParts || '');
  return (
    PARTNER_NAV_FLAT.find((item) => item.slug === slug) ||
    ACCOUNT_ITEMS_WITH_HREF.find((item) => item.slug === slug) ||
    null
  );
}
