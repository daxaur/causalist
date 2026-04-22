export function LayerLegend({
  layers,
}: {
  layers: { key: string; label: string; color: string }[];
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/40 p-3 backdrop-blur">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
        layers
      </div>
      <ul className="space-y-1.5">
        {layers.map((l) => (
          <li key={l.key} className="flex items-center gap-2 text-xs text-white/70">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span>{l.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
