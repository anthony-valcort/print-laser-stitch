/**
 * Site-wide ambient layer — three slow-drifting neon orbs (yellow / cyan /
 * magenta) blurred behind everything. Adds atmospheric depth to the pure-black
 * background without competing with content. Honors prefers-reduced-motion.
 */
export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-[10%] top-[15%] h-[40vw] max-h-[36rem] w-[40vw] max-w-[36rem] animate-drift-1 rounded-full bg-[#d9f000] opacity-[0.10] blur-3xl" />
      <div className="absolute right-[5%] top-[45%] h-[36vw] max-h-[32rem] w-[36vw] max-w-[32rem] animate-drift-2 rounded-full bg-[#18d3e8] opacity-[0.10] blur-3xl" />
      <div className="absolute left-[20%] bottom-[10%] h-[32vw] max-h-[28rem] w-[32vw] max-w-[28rem] animate-drift-3 rounded-full bg-[#d94cb3] opacity-[0.08] blur-3xl" />
    </div>
  );
}
