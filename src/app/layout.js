import './globals.css';

export const metadata = {
  title: 'GGFIX — Repair · Buy · Sell',
  description:
    'GGFIX by GloboGreen — book a mobile repair, get doorstep pickup, sell or buy a device, and run your repair shop end to end.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16A34A',
  // This app is light-themed only — no dark-mode stylesheet exists anywhere.
  // Without this, a device in dark mode (Android especially) has the
  // browser auto-dark-theme native form controls and can shift light
  // pastel colors (e.g. the pale-green "Ready By" badge, the Duration
  // <select>) toward blue on its own, which looks like a rendering bug but
  // isn't one this app's own CSS causes.
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
