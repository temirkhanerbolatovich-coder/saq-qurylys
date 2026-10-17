// Public build-time values only: tile providers receive the browser's IP and viewport.
const url =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "OpenStreetMap contributors";
const attributionUrl =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION_URL ??
  "https://www.openstreetmap.org/copyright";

function isPublicHttps(value: string) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

export function mapConfig() {
  const resolved = url.replace(/\{[xyz]\}/g, "0");
  if (
    !url ||
    !["{x}", "{y}", "{z}"].every((part) => url.includes(part)) ||
    /[{}]/.test(resolved) ||
    !isPublicHttps(resolved) ||
    !isPublicHttps(attributionUrl) ||
    !attribution.trim()
  )
    return null;
  return { url, attribution, attributionUrl };
}
