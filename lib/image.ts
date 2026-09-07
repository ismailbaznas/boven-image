/**
 * Blogger image variant helper — tiru format hemat bandwidth di docs/blog_image_format.html
 * Blogger/Picasa: URL mengandung segmen /s0/, /s1600/, /w200-h150/, /w320-h240/, /w640-h480/, dst
 * Server resize otomatis berdasarkan segmen sebelum filename.
 * Simpan s0 di DB (original), generate varian on-the-fly untuk preview.
 */

export type BloggerVariant = "thumb" | "card" | "medium" | "full" | "original";

const VARIANT_MAP: Record<BloggerVariant, string> = {
  thumb: "w200-h150",   // grid terkecil ~25KB
  card: "w320-h240",    // card preview ~35KB (rekomendasi grid 220px)
  medium: "w640-h480",  // modal preview ~80KB
  full: "s1600",        // lightbox/href ~300KB
  original: "s0",       // original tanpa resize
};

const BLOGGER_HOSTS = ["blogger.googleusercontent.com", "lh3.googleusercontent.com", "lh4.googleusercontent.com", "bp.blogspot.com"];

export function isBloggerUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return BLOGGER_HOSTS.some((h) => u.hostname.includes(h) || u.hostname.endsWith("googleusercontent.com"));
  } catch {
    return false;
  }
}

/**
 * Ubah URL Blogger ke varian tertentu.
 * Contoh: https://lh3.googleusercontent.com/.../s0/FKP.jpeg -> .../w320-h240/FKP.jpeg
 * Jika bukan Blogger URL (R2/S3), kembalikan as-is.
 */
export function bloggerVariant(url: string, variant: BloggerVariant): string {
  if (!url || !isBloggerUrl(url)) return url;
  const seg = VARIANT_MAP[variant];
  // Ganti segmen /s{d+}/ atau /s{d+}-c/ atau /w{d+}(-h{d+})?(-.*)?/ sebelum filename
  // Pola Blogger: /s1600/ , /s0/ , /w200-h150/ , /w640-h480-c/ , /s1600-rw/
  return url
    .replace(/\/s\d+(-c|-rw|-p)?\//, `/${seg}/`)
    .replace(/\/w\d+(-h\d+)?(-c|-rw)?\//, `/${seg}/`);
}

export function bloggerSrcSet(url: string): string {
  if (!isBloggerUrl(url)) return url;
  return [
    `${bloggerVariant(url, "thumb")} 320w`,
    `${bloggerVariant(url, "card")} 640w`,
    `${bloggerVariant(url, "medium")} 1024w`,
  ].join(", ");
}
