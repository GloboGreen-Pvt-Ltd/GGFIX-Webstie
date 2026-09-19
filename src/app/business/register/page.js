import BusinessRegister from '@/components/site/BusinessRegister';

/**
 * Lives OUTSIDE the (site) route group on purpose — same reasoning as
 * src/app/shop-home/page.js: this page has its own full-screen chrome (a
 * slim custom header inside BusinessRegister), not the marketing
 * SiteHeader/SiteFooter. Nesting under (site) would wrap it in both,
 * doubling the header.
 */
export const metadata = {
  title: 'Start Your Business — GGFIX',
  description:
    'Create your GGFIX business account and start selling products and offering repair services across GGFIX.',
};

export default function BusinessRegisterPage() {
  return <BusinessRegister />;
}
