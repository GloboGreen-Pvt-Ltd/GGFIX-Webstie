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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
