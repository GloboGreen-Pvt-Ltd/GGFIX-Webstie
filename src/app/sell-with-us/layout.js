import { Inter, Raleway } from 'next/font/google';

import { pageMetadata } from '@/lib/seo';

/**
 * /sell-with-us — the seller homepage. Lives outside the (site) group so it
 * gets its own seller header/footer instead of the customer SiteHeader, and
 * loads its font (Inter, headings and body) for this route only — no global
 * font change.
 */

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter', display: 'swap' });
// Raleway is used only for the GGFIX logo wordmark (.ggfix-logo-text).
const raleway = Raleway({ subsets: ['latin'], weight: ['500'], variable: '--font-raleway', display: 'swap' });

// The seller (shop) homepage — /sell is the separate customer page for selling
// a used phone. `?login=1` variants canonicalise here.
export const metadata = pageMetadata({
  title: 'Sell With Us – Grow Your Device Business | GGFIX',
  absoluteTitle: true,
  description:
    'List devices, reach more customers, manage orders and grow your repair or device business with GGFIX. Register your shop and start with a free trial.',
  path: '/sell-with-us',
});

export default function SellWithUsLayout({ children }) {
  return (
    <div id="sell-with-us-root" className={`${inter.variable} ${raleway.variable} min-h-screen bg-white font-[family-name:var(--font-inter)] text-[#1E1E1E] antialiased`}>
      {/* Google Material Symbols (Outlined), used by every icon on this page — see MaterialIcon.js. */}
      {/* display=block (not swap): an icon font must never flash its ligature names as text while loading. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display -- icon font scoped to this route. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      />
      {children}
    </div>
  );
}
