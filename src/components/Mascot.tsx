import Image from "next/image";

/**
 * Anthony, the Print Laser Stitch mascot. To change a pose, replace the PNG
 * in /public/mascot and keep the same file name (and the same proportions).
 */
const POSES = {
  welcome: { src: "/mascot/anthony-hat-welcome.png", width: 1086, height: 1448 },
  thumbs: { src: "/mascot/anthony-hat-thumbs.png", width: 1086, height: 1448 },
} as const;

export type MascotPose = keyof typeof POSES;

export default function Mascot({
  pose,
  className = "",
  sizes = "200px",
  alt = "",
  motion = "sway",
  priority = false,
}: {
  pose: MascotPose;
  className?: string;
  sizes?: string;
  /** Leave empty for decoration; describe him when he is the point of the section. */
  alt?: string;
  motion?: "sway" | "bob" | "none";
  priority?: boolean;
}) {
  const p = POSES[pose];
  const anim =
    motion === "sway"
      ? "animate-mascot-sway motion-reduce:animate-none"
      : motion === "bob"
        ? "animate-float motion-reduce:animate-none"
        : "";
  return (
    <div className={className}>
      <Image
        src={p.src}
        alt={alt}
        width={p.width}
        height={p.height}
        sizes={sizes}
        priority={priority}
        className={"h-auto w-full select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)] " + anim}
        draggable={false}
      />
    </div>
  );
}
