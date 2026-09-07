export function slugify(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function buildBovenDigoelId(seq: number): string {
  return `boven-digoel-${seq}`;
}

export function buildDescriptiveFilename(
  originalFileName: string,
  organisasi: string,
  program: string,
  id: string
): string {
  const parts = originalFileName.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
  const baseName = slugify(parts.join("."));

  const orgSlug = slugify(organisasi);
  const progSlug = slugify(program);
  const idSlug = slugify(id);

  // jika file bernama 'rumah.jpg', organisasi='BAZNAS Boven Digoel', program='Pembagian Zakat Fitrah', id='boven-digoel1'
  // hasil: rumah-baznas-boven-digoel-pembagian-zakat-fitrah-boven-digoel1.jpg
  const segments = [baseName, orgSlug, progSlug, idSlug].filter(Boolean);
  return `${segments.join("-")}.${ext}`;
}

export function buildMediaId(title: string, orgSlug: string, seq: number): string {
  const t = slugify(title);
  const o = slugify(orgSlug);
  return `${t}-${o}-${String(seq).padStart(3, "0")}`;
}

export function buildFilename(id: string, ext: string): string {
  const e = ext.replace(/^\./, "").toLowerCase() || "jpg";
  return `${id}.${e}`;
}
