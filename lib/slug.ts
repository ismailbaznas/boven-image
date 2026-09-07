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

export function buildMediaId(title: string, orgSlug: string, seq: number): string {
  // pembagian-zakat-fitrah-baznas-boven-digoel-001
  const t = slugify(title);
  const o = slugify(orgSlug);
  return `${t}-${o}-${String(seq).padStart(3, "0")}`;
}

export function buildFilename(id: string, ext: string): string {
  const e = ext.replace(/^\./, "").toLowerCase() || "jpg";
  return `${id}.${e}`;
}
