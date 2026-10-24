export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-sm text-slate-500">This screen is wired up. Full UI lands in the next steps.</p>
      </div>
    </div>
  );
}
