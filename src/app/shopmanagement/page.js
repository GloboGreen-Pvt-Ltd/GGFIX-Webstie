import ShopLogin from '@/components/site/shoplogin';

/**
 * Lives OUTSIDE the (site) route group on purpose — same reasoning as
 * src/app/shop-home/page.js and src/app/business/register/page.js: this page
 * has its own full-screen chrome (the premium centered login card), not the
 * marketing SiteHeader/SiteFooter. Nesting under (site) would wrap it in
 * both, doubling the header.
 */
export const metadata = {
  title: 'Business Login — GGFIX',
  description: 'Sign in to manage your GGFIX shop — bookings, inventory and orders in one place.',
};

export default function ShopManagementPage() {
  return <ShopLogin />;
}
