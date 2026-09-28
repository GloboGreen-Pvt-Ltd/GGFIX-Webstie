import { cx } from '@/components/site/ui';

/**
 * Icon3D — the one shared "soft 3D icon" primitive the whole Partner
 * Dashboard redesign hangs off (see plan: noble-wiggling-deer). A gradient
 * rounded badge with a soft colored shadow and a subtle glossy top-inset
 * highlight, standing in for the flat single-color icon circles this app
 * used before. Every tone keeps the existing brand green family
 * (`#15803D`/`#166534`) as its anchor — this is a shape/depth upgrade, not
 * a palette change.
 */
// Each `shadow` value is one combined box-shadow (inset glossy highlight +
// outer colored drop shadow) — two separate `shadow-[...]` utility classes
// on the same element would NOT combine, since each is a full box-shadow
// value that replaces the other, not a layer that stacks with it.
const TONES = {
  green: { grad: 'from-[#22C55E] to-[#15803D]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(21,128,61,0.35)]' },
  mint: { grad: 'from-[#34D399] to-[#059669]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(5,150,105,0.32)]' },
  blue: { grad: 'from-[#38BDF8] to-[#0284C7]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(2,132,199,0.32)]' },
  orange: { grad: 'from-[#FB923C] to-[#EA580C]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(234,88,12,0.3)]' },
  violet: { grad: 'from-[#A78BFA] to-[#7C3AED]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(124,58,237,0.3)]' },
  red: { grad: 'from-[#FB7185] to-[#E11D48]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(225,29,72,0.3)]' },
  teal: { grad: 'from-[#2DD4BF] to-[#0D9488]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(13,148,136,0.3)]' },
  indigo: { grad: 'from-[#818CF8] to-[#4F46E5]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(79,70,229,0.3)]' },
  gray: { grad: 'from-[#CBD5E1] to-[#94A3B8]', shadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_10px_rgba(100,116,139,0.2)]' },
};

const SIZES = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4', radius: 'rounded-xl' },
  md: { box: 'h-10 w-10', icon: 'h-5 w-5', radius: 'rounded-2xl' },
  lg: { box: 'h-12 w-12', icon: 'h-6 w-6', radius: 'rounded-2xl' },
  xl: { box: 'h-16 w-16', icon: 'h-7 w-7', radius: 'rounded-2xl' },
  xxl: { box: 'h-20 w-20', icon: 'h-8 w-8', radius: 'rounded-2xl' },
};

export default function Icon3D({ icon: Icon, tone = 'green', size = 'md', className }) {
  const t = TONES[tone] || TONES.green;
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white', t.grad, t.shadow, s.box, s.radius, className)}
    >
      <Icon className={s.icon} aria-hidden="true" />
    </span>
  );
}
