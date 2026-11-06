export const RESOURCE_CATEGORIES = [
  'logos',
  'people',
  'products',
  'brand',
  'style',
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];
export type ThumbnailResource = {
  category: ResourceCategory;
  file?: string;
  label: string;
  note?: string;
  source?: string;
  url?: string;
};
export type ResourceImage = 'jpeg' | 'png' | 'webp';
// Next's proxy buffers request bodies at 10 MB, so stay safely under it.
export const RESOURCE_MAX_BYTES = 8 * 1024 * 1024;

export function isResourceCategory(value: unknown): value is ResourceCategory {
  return RESOURCE_CATEGORIES.includes(value as ResourceCategory);
}
export function isResourceFile(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 120 &&
    /^\w[\w.-]*\.(png|jpe?g|webp|svg)$/i.test(value)
  );
}
export function resourceUrl(category: ResourceCategory, file: string): string {
  return `/api/labs/thumbnails/resources/${category}/${encodeURIComponent(file)}`;
}
export function resourceContentType(file: string): string {
  const extension = file.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'svg') return 'image/svg+xml';
  return 'image/jpeg';
}
export function sniffImage(bytes: Uint8Array): ResourceImage | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'jpeg';
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    )
  )
    return 'png';
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}
export function labelFromFile(file: string): string {
  const words = file
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return words ? words[0].toUpperCase() + words.slice(1) : file;
}
export function safeSource(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}
