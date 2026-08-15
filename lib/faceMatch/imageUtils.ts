/**
 * Browser-only image helpers for the Tier 1 face-match flow. Never
 * import these from a Server Component or API route — they use the
 * DOM (Image, canvas) directly and only run in a "use client" tree.
 */

export function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image — try a different file."));
    };
    img.src = url;
  });
}

/**
 * Downscales + JPEG-compresses an image so it's small enough to store
 * as a base64 column in Postgres (aiming for tens to a couple hundred
 * KB, not the several MB a modern phone camera produces) while
 * staying clear enough for face matching and human review.
 */
export function compressImage(img: HTMLImageElement, maxDimension = 900, quality = 0.82): string {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}
