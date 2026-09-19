export default function CardShell({ title, action, children }) {
  return (
    <section className="rounded-3xl border border-[#EAECF0] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.08)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#101828]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
