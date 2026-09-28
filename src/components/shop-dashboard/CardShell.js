export default function CardShell({ title, action, children }) {
  return (
    <section className="rounded-3xl border border-[#E5ECE8] bg-white p-4 shadow-[0_8px_30px_rgba(20,80,55,0.06)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#101828]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
