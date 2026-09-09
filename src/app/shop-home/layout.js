import DashboardShell from '@/components/shop-dashboard/DashboardShell';

/**
 * Wraps every route under /shop-home/* in the Partner Dashboard shell
 * (sidebar + top navbar + auth guard) — see DashboardShell's own doc
 * comment. Lives outside the (site) route group, same as before: this is
 * its own app chrome, not the marketing SiteHeader/SiteFooter.
 */
export default function ShopHomeLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
