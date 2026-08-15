import { hueFromSeed, initialsFromName } from "@/lib/avatar";

export function Avatar({
  name,
  seed,
  size = 48,
}: {
  name: string;
  seed: string;
  size?: number;
}) {
  const hue = hueFromSeed(seed);
  return (
    <div
      className="flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 62% 46%), hsl(${(hue + 40) % 360} 62% 38%))`,
      }}
      aria-hidden="true"
    >
      {initialsFromName(name)}
    </div>
  );
}
