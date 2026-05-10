import { colorHex } from "./colors";

export function ColorSwatch({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const hex = colorHex(name);
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className={`group relative flex items-center gap-2 rounded-full border px-1 py-1 transition ${
        active
          ? "border-highlight bg-highlight-soft"
          : "border-border-soft bg-white/3 hover:bg-white/6"
      }`}
    >
      {hex ? (
        <span
          className="h-7 w-7 rounded-full border border-white/15 shadow-inner"
          style={{ background: hex }}
        />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[10px] font-bold uppercase text-foreground">
          {name.slice(0, 2)}
        </span>
      )}
      <span className="pr-3 text-xs font-medium">{name}</span>
    </button>
  );
}
