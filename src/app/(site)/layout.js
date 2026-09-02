import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { BRAND } from '@/lib/siteContent';

export const metadata = {
  title: {
    default: 'GGFIX — Repair · Buy · Sell',
    template: '%s · GGFIX',
  },
  description:
    'GGFIX is a platform for mobile repair shops and their customers. Book a repair, get doorstep pickup, sell your old phone to the highest-quoting shop nearby, or run your entire repair shop — bookings, technicians, staff attendance, inventory and invoices — from one app.',
  applicationName: BRAND.name,
  keywords: [
    'mobile repair',
    'phone repair app',
    'doorstep phone pickup',
    'sell old phone',
    'repair shop software',
    'repair shop management',
    'GGFIX',
    'GloboGreen',
  ],
  authors: [{ name: BRAND.company, url: BRAND.websiteUrl }],
  openGraph: {
    title: 'GGFIX — Repair · Buy · Sell',
    description:
      'Book a repair, get doorstep pickup, sell your old phone to the highest-quoting shop nearby — or run your whole repair shop from one app.',
    siteName: BRAND.name,
    type: 'website',
  },
};

export default function SiteLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
