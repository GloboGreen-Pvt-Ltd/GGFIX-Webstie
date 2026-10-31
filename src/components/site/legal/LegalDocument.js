import { Fragment } from 'react';
import Link from 'next/link';
import { ArrowUp, Building2, CalendarCheck, CalendarClock, FileText, ShieldCheck } from 'lucide-react';

import SeoBreadcrumb from '@/components/site/SeoBreadcrumb';
import { Badge, Container, cx } from '@/components/site/ui';
import LegalToc from './LegalToc';

/**
 * Full /terms or /privacy page from one document in src/lib/legalContent.js.
 *
 * Every heading, clause, sub-clause, list and paragraph of the source PDF is
 * rendered in order and with its own numbering — nothing summarised, nothing
 * reworded. `**bold**` spans and line breaks in the data are reproduced. The
 * only text added is page chrome: the hero, the contents list and the links
 * at the end.
 *
 * Anchors: each section is #section-<num> (the table of contents) and each
 * numbered clause is #clause-<num with dots as dashes>, e.g. #clause-6-4.
 * Server component — the whole document is in the exported HTML.
 */

// Company details exactly as the documents state them.
const COMPANY = {
  name: 'Globogreen System and Technology Pvt. Ltd.',
  brand: 'Near G Fix',
  office: 'No. 1/16, South Street, Villiyanallur, Bhuvanagiri Taluk, Tamil Nadu, India',
  website: 'neargfix.com',
};

// Clears the sticky SiteHeader (~121px below md, 64–100px md–lg, ~117px
// compact lg+) when a #section / #clause anchor is jumped to.
const ANCHOR_OFFSET = 'scroll-mt-36 md:scroll-mt-28 lg:scroll-mt-40';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

export const sectionId = (section) => `section-${section.num}`;

function clauseId(num) {
  return num ? `clause-${num.replace(/\.$/, '').replace(/\./g, '-')}` : undefined;
}

/** "6.4 Retention of Device Content" / "1.1. \"Platform\"" -> "6.4" / "1.1" */
function headingNumber(text) {
  const match = /^(\d+(?:\.\d+)+)\.?\s/.exec(text);
  return match ? match[1] : null;
}

/** `**` toggles bold; "\n" is a line break. */
function Rich({ text }) {
  return text.split('**').map((part, i) => {
    const lines = part.split('\n');
    const content = lines.map((line, j) => (
      // eslint-disable-next-line react/no-array-index-key -- static text, never reordered.
      <Fragment key={j}>
        {j > 0 ? <br /> : null}
        {line}
      </Fragment>
    ));
    // eslint-disable-next-line react/no-array-index-key -- static text, never reordered.
    return i % 2 ? <strong key={i}>{content}</strong> : <Fragment key={i}>{content}</Fragment>;
  });
}

function Block({ block, ids }) {
  // Ids stay unique even if a clause number were ever repeated.
  const claim = (num) => {
    const id = clauseId(num);
    if (!id || ids.has(id)) return undefined;
    ids.add(id);
    return id;
  };

  switch (block.type) {
    case 'h':
      return (
        <h3 id={claim(headingNumber(block.text))} className={cx('mt-7 text-base font-bold text-brand-ink sm:text-[17px]', ANCHOR_OFFSET)}>
          <Rich text={block.text} />
        </h3>
      );
    case 'n':
      return (
        <div id={claim(block.num)} className={cx('mt-4 flex gap-3', ANCHOR_OFFSET)}>
          <span className="min-w-[2.75rem] shrink-0 font-semibold tabular-nums text-brand-ink">{block.num}</span>
          <p className="min-w-0">
            <Rich text={block.text} />
          </p>
        </div>
      );
    case 'ul':
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-6 marker:text-brand-600">
          {block.items.map((item, i) => (
            // eslint-disable-next-line react/no-array-index-key -- static text, never reordered.
            <li key={i} className="pl-1">
              <Rich text={item} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      // Items carry their own "a." / "b." lettering from the source.
      return (
        <ol className="mt-3 list-none space-y-1.5 pl-6">
          {block.items.map((item, i) => (
            // eslint-disable-next-line react/no-array-index-key -- static text, never reordered.
            <li key={i}>
              <Rich text={item} />
            </li>
          ))}
        </ol>
      );
    default:
      return (
        <p className="mt-4">
          <Rich text={block.text} />
        </p>
      );
  }
}

/**
 *   doc          LEGAL_DOCS.TERMS or LEGAL_DOCS.PRIVACY
 *   title        page title ("Terms and Conditions")
 *   description  one-line summary under the title (page chrome, not policy text)
 *   path         '/terms' or '/privacy'
 *   related      { href, title, description } — the other document
 */
export default function LegalDocument({ doc, title, description, path, related }) {
  const toc = doc.sections.map((section) => ({ id: sectionId(section), num: section.num, title: section.title }));
  const ids = new Set();

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-brand-line bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-6 sm:py-8 lg:py-10">
          <SeoBreadcrumb
            items={[
              { name: 'Home', path: '/' },
              { name: title, path },
            ]}
          />

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-3xl">
              <Badge icon={doc.type === 'PRIVACY' ? ShieldCheck : FileText}>Legal</Badge>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">{title}</h1>
              <p className="mt-3 text-base leading-relaxed text-brand-muted">{description}</p>
            </div>

            <dl className="grid shrink-0 grid-cols-2 gap-3 text-sm sm:max-w-md">
              <div className="rounded-2xl border border-brand-line bg-white px-4 py-3 shadow-soft">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <CalendarCheck className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                  Effective Date
                </dt>
                <dd className="mt-1 font-bold text-brand-ink">{doc.effectiveDate}</dd>
              </div>
              <div className="rounded-2xl border border-brand-line bg-white px-4 py-3 shadow-soft">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  <CalendarClock className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                  Last Updated
                </dt>
                <dd className="mt-1 font-bold text-brand-ink">{doc.lastUpdated}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brand-line bg-white p-4 text-sm leading-relaxed text-brand-muted shadow-soft">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-700" aria-hidden="true">
              <Building2 className="h-[18px] w-[18px]" />
            </span>
            <p className="min-w-0 break-words">
              <strong className="font-semibold text-brand-ink">{COMPANY.name}</strong>
              <span className="mx-1.5 text-brand-subtle" aria-hidden="true">·</span>
              Trading/Brand Name: {COMPANY.brand}
              <br />
              Registered Office: {COMPANY.office}
              <span className="mx-1.5 text-brand-subtle" aria-hidden="true">·</span>
              Website: {COMPANY.website}
            </p>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Contents + full document                                          */}
      {/* ---------------------------------------------------------------- */}
      <Container className="py-6 sm:py-8 lg:py-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-10">
          <LegalToc items={toc} />

          <div className="min-w-0">
            <article
              id="legal-document"
              aria-label={title}
              className={cx(
                'break-words rounded-3xl border border-brand-line bg-white p-5 text-[15px] leading-7 text-brand-ink/80 shadow-soft sm:p-8 sm:text-base lg:p-10',
                ANCHOR_OFFSET,
              )}
            >
              {/* The document's own title block, as in the source. */}
              <header className="border-b border-brand-line pb-5 text-center">
                <p className="text-xl font-extrabold tracking-wide text-brand-ink underline decoration-2 underline-offset-[6px] sm:text-2xl">
                  {doc.heading}
                </p>
                <p className="mt-4 text-sm font-semibold text-brand-ink">
                  Effective Date: {doc.effectiveDate}
                  <br />
                  Last Updated: {doc.lastUpdated}
                </p>
              </header>

              <div className="pt-1">
                {doc.intro.map((block, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- static content, never reordered.
                  <Block key={i} block={block} ids={ids} />
                ))}
              </div>

              {doc.sections.map((section) => {
                const id = sectionId(section);
                return (
                  <section
                    key={id}
                    id={id}
                    aria-labelledby={`${id}-title`}
                    className={cx('mt-9 border-t border-brand-line pt-7', ANCHOR_OFFSET)}
                  >
                    <h2
                      id={`${id}-title`}
                      tabIndex={-1}
                      className="flex gap-2 text-lg font-bold leading-snug tracking-tight text-brand-ink focus:outline-none sm:text-xl"
                    >
                      <span className="shrink-0 tabular-nums text-brand-700">{section.num}.</span>
                      <span className="min-w-0">{section.title}</span>
                    </h2>
                    {section.blocks.map((block, i) => (
                      // eslint-disable-next-line react/no-array-index-key -- static content, never reordered.
                      <Block key={i} block={block} ids={ids} />
                    ))}
                  </section>
                );
              })}
            </article>

            {/* ---- After the document: back to top + the other policy ------ */}
            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <Link
                href={related.href}
                className={cx(
                  'group flex items-center gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-soft transition hover:border-brand-300',
                  FOCUS_RING,
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-700" aria-hidden="true">
                  {doc.type === 'PRIVACY' ? <FileText className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-brand-ink group-hover:text-brand-700">{related.title}</span>
                  <span className="block text-sm text-brand-muted">{related.description}</span>
                </span>
              </Link>
              <a
                href="#legal-document"
                className={cx(
                  'inline-flex items-center justify-center gap-1.5 rounded-full border border-brand-line bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-soften',
                  FOCUS_RING,
                )}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                Back to top
              </a>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
