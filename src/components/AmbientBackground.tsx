/**
 * Site-wide ambient layer — three slow-drifting orbs in a sophisticated
 * indigo/pink/cyan palette (Vercel/Linear-style atmospheric look). Brand
 * neons (yellow/cyan/magenta) stay reserved for foreground CTAs and accents.
 * Honors prefers-reduced-motion.
 */
export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Drifting atmospheric orbs */}
      <div className="absolute left-[5%] top-[8%] h-[55vw] max-h-176 w-[55vw] max-w-176 animate-drift-1 rounded-full bg-[#6366f1] opacity-30 blur-[100px]" />
      <div className="absolute right-[0%] top-[30%] h-[50vw] max-h-160 w-[50vw] max-w-160 animate-drift-2 rounded-full bg-[#22d3ee] opacity-30 blur-[100px]" />
      <div className="absolute left-[12%] bottom-[2%] h-[45vw] max-h-144 w-[45vw] max-w-xl animate-drift-3 rounded-full bg-[#ec4899] opacity-28 blur-[100px]" />

      {/* Cyberpunk dot grid overlay — sits ABOVE the orbs so dots stay crisp */}
      <div className="absolute inset-0 dot-grid" />
    </div>
  );
}
