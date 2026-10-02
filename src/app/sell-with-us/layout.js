import { Inter, Raleway } from 'next/font/google';

/**
 * /sell-with-us — the seller homepage. Lives outside the (site) group so it
 * gets its own seller header/footer instead of the customer SiteHeader, and
 * loads its font (Inter, headings and body) for this route only — no global
 * font change.
 */

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter', display: 'swap' });
// Raleway is used only for the GGFIX logo wordmark (.ggfix-logo-text).
const raleway = Raleway({ subsets: ['latin'], weight: ['500'], variable: '--font-raleway', display: 'swap' });

export const metadata = {
  title: 'Sell with GGFIX — Grow your device business',
  description: 'List your devices, reach more customers, manage orders and grow your business with GGFIX.',
};

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
