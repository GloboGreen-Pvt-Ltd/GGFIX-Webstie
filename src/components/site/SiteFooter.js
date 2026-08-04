import Link from 'next/link';
import Image from 'next/image';
import { Mail, MessageCircle, Phone, Globe } from 'lucide-react';

import { BRAND, FOOTER_NAV } from '@/lib/siteContent';
import { Container } from './ui';

const CONTACT_LINKS = [
  { key: 'phone', Icon: Phone, label: BRAND.phone, href: BRAND.phoneHref, external: false },
  {
    key: 'whatsapp',
    Icon: MessageCircle,
    label: `WhatsApp ${BRAND.whatsapp}`,
    href: BRAND.whatsappHref,
    external: true,
  },
  { key: 'email', Icon: Mail, label: BRAND.email, href: BRAND.emailHref, external: false },
  { key: 'web', Icon: Globe, label: BRAND.website, href: BRAND.websiteUrl, external: true },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-line bg-white">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
              aria-label={`${BRAND.name} home`}
            >
              <Image
                src={BRAND.logo}
                alt={BRAND.logoAlt}
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl object-contain"
              />
              <span className="text-xl font-extrabold tracking-tight text-brand-ink">
                {BRAND.name}
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-muted">
              {BRAND.description}
            </p>

            <p className="mt-4 text-sm font-semibold text-brand-700">{BRAND.tagline}</p>

            <ul className="mt-6 space-y-3">
              {CONTACT_LINKS.map(({ key, Icon, label, href, external }) => (
                <li key={key}>
                  <a
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex items-center gap-2.5 rounded-lg text-sm font-medium text-brand-muted transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="break-all">{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {FOOTER_NAV.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-brand-ink">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="rounded-lg text-sm text-brand-muted transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-12 flex flex-col gap-4 border-t border-brand-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-brand-muted">
            © {year} {BRAND.company}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              href="/terms"
              className="rounded-lg text-brand-muted transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="rounded-lg text-brand-muted transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
            >
              Privacy
            </Link>
            <Link
              href="/management"
              className="rounded-lg text-brand-muted transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
            >
              Admin Portal
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-brand-muted">{BRAND.appsStatus}</p>
      </Container>
    </footer>
  );
}
