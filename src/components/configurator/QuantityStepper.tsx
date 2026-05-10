"use client";

export function QuantityStepper({
  value,
  min = 1,
  disabled,
  onChange,
}: {
  value: number;
  min?: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center rounded-xl border border-border-soft bg-white/3">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-1.5 text-base font-bold text-foreground/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) && v >= min ? Math.floor(v) : min);
        }}
        className="w-14 bg-transparent text-center text-sm font-semibold outline-none disabled:opacity-40"
        suppressHydrationWarning
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="px-3 py-1.5 text-base font-bold text-foreground/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

/** Same as QuantityStepper but allows going down to zero (used in size matrix). */
export function SizeQtyStepper({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return <QuantityStepper value={value} min={0} disabled={disabled} onChange={onChange} />;
}
