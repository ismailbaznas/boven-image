import { createAdminSupabase } from "./supabase/admin";

export type ManifestData = {
  organizations: any[];
  programs: any[];
  media: any[];
  summary: {
    total_media: number;
    total_organizations: number;
    total_programs: number;
    last_synced_at: string;
    target_blogger_id: string;
  };
};

export async function fetchCatalogData(): Promise<ManifestData> {
  const sb = createAdminSupabase();

  const [orgsRes, progsRes, mediaRes] = await Promise.all([
    sb.from("organizations").select("*").order("name"),
    sb.from("programs").select("*").order("name"),
    sb.from("media").select("*").order("created_at", { ascending: false }),
  ]);

  const organizations = orgsRes.data || [];
  const programs = progsRes.data || [];
  const media = mediaRes.data || [];

  const summary = {
    total_media: media.length,
    total_organizations: organizations.length,
    total_programs: programs.length,
    last_synced_at: new Date().toISOString(),
    target_blogger_id: process.env.BLOGGER_BLOG_ID || "3348673630650024103",
  };

  return { organizations, programs, media, summary };
}

function generateSqlBackup(data: ManifestData): string {
  const lines: string[] = [
    `-- ========================================================`,
    `-- Boven Image / Media Vault - Disaster Recovery SQL Dump`,
    `-- Generated: ${data.summary.last_synced_at}`,
    `-- Total Media: ${data.summary.total_media}`,
    `-- ========================================================`,
    ``,
  ];

  // Organizations
  if (data.organizations.length > 0) {
    lines.push(`-- Organizations`);
    for (const org of data.organizations) {
      const id = JSON.stringify(org.id);
      const name = JSON.stringify(org.name);
      const slug = JSON.stringify(org.slug);
      const cover = org.cover_media_id ? JSON.stringify(org.cover_media_id) : "NULL";
      lines.push(
        `INSERT INTO public.organizations (id, name, slug, cover_media_id) VALUES (${id}, ${name}, ${slug}, ${cover}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, cover_media_id = EXCLUDED.cover_media_id;`
      );
    }
    lines.push(``);
  }

  // Programs
  if (data.programs.length > 0) {
    lines.push(`-- Programs`);
    for (const prog of data.programs) {
      const id = JSON.stringify(prog.id);
      const orgId = JSON.stringify(prog.organization_id);
      const name = JSON.stringify(prog.name);
      const slug = JSON.stringify(prog.slug);
      lines.push(
        `INSERT INTO public.programs (id, organization_id, name, slug) VALUES (${id}, ${orgId}, ${name}, ${slug}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`
      );
    }
    lines.push(``);
  }

  // Media
  if (data.media.length > 0) {
    lines.push(`-- Media`);
    for (const m of data.media) {
      const id = JSON.stringify(m.id);
      const filename = JSON.stringify(m.filename);
      const title = JSON.stringify(m.title || "");
      const bUrl = JSON.stringify(m.blogger_url);
      const bUrl1600 = JSON.stringify(m.blogger_url_s1600 || m.blogger_url);
      const hash = JSON.stringify(m.hash || "");
      const meta = JSON.stringify(JSON.stringify(m.metadata || {}));
      const orgId = m.organization_id ? JSON.stringify(m.organization_id) : "NULL";
      const progId = m.program_id ? JSON.stringify(m.program_id) : "NULL";
      const width = m.width || 0;
      const height = m.height || 0;
      const createdAt = JSON.stringify(m.created_at || new Date().toISOString());

      lines.push(
        `INSERT INTO public.media (id, filename, title, blogger_url, blogger_url_s1600, hash, metadata, organization_id, program_id, width, height, created_at) VALUES (${id}, ${filename}, ${title}, ${bUrl}, ${bUrl1600}, ${hash}, ${meta}::jsonb, ${orgId}, ${progId}, ${width}, ${height}, ${createdAt}) ON CONFLICT (id) DO NOTHING;`
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function generateReadme(data: ManifestData): string {
  return `# 🗄️ Boven Image — Disaster Recovery Manifest

Repositori ini menyimpan salinan lengkap metadata & URL arsip visual **Boven Image (Media Vault)** sebagai perlindungan independen dari ketergantungan database (*Database-Agnostic Disaster Recovery*).

---

## 📊 Status Arsip Terkini

- **Terakhir Disinkronkan:** \`${data.summary.last_synced_at}\`
- **Total Media Foto:** **${data.summary.total_media} media**
- **Total Organisasi:** **${data.summary.total_organizations} folder**
- **Total Program Kegiatan:** **${data.summary.total_programs} program**
- **Storage Fisik Foto:** Google Blogger CDN (\`lh3.googleusercontent.com\`) — Blog ID \`${data.summary.target_blogger_id}\`

---

## 📁 Struktur Data

- \`data/media.json\`: Seluruh rekaman media, ID (\`boven-digoel-[N]\`), URL foto asli (\`s0\`), SHA-256 hash, dan metadata.
- \`data/organizations.json\`: Daftar organisasi & konfigurasi sampul.
- \`data/programs.json\`: Hierarki program per organisasi.
- \`data/summary.json\`: Ringkasan statistik & timestamp sync.
- \`sql/backup.sql\`: Skrip SQL standar siap pakai untuk restore ke PostgreSQL, Supabase baru, SQLite, atau platform database lainnya.

---

## 🔄 Panduan Pemulihan (Disaster Recovery)

Jika database utama bermasalah:
1. **Restore ke PostgreSQL / Supabase Baru:**
   Jalankan file \`sql/backup.sql\` pada SQL editor database baru.
2. **Restore via JSON API:**
   Gunakan file \`data/media.json\` untuk mengimpor ulang seluruh katalog ke sistem baru tanpa perlu mengunggah ulang foto ke Blogger.

*Otomatis disinkronkan oleh Media Vault Engine.*
`;
}

async function getExistingFileSha(
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      return json.sha || null;
    }
  } catch {}
  return null;
}

async function commitFileToGithub(
  repo: string,
  path: string,
  contentStr: string,
  commitMessage: string,
  branch: string,
  token: string
) {
  const sha = await getExistingFileSha(repo, path, branch, token);
  const contentBase64 = Buffer.from(contentStr, "utf-8").toString("base64");

  const body: any = {
    message: commitMessage,
    content: contentBase64,
    branch,
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API Error [${res.status}] on ${path}: ${json.message || "Failed to commit"}`);
  }
  return json;
}

export async function syncManifestToGitHub(): Promise<{
  success: boolean;
  total_media: number;
  synced_at: string;
  files: string[];
  error?: string;
}> {
  const repo = process.env.GITHUB_MANIFEST_REPO || "ismailbaznas/boven-image-manifest";
  const token = process.env.GITHUB_MANIFEST_TOKEN;
  const branch = process.env.GITHUB_MANIFEST_BRANCH || "main";

  if (!token) {
    throw new Error("GITHUB_MANIFEST_TOKEN is not configured in environment.");
  }

  const data = await fetchCatalogData();
  const dateStr = new Date().toLocaleDateString("id-ID");
  const commitMsg = `sync: Backup manifest ${data.summary.total_media} media (${dateStr})`;

  const filesToCommit = [
    { path: "data/summary.json", content: JSON.stringify(data.summary, null, 2) },
    { path: "data/organizations.json", content: JSON.stringify(data.organizations, null, 2) },
    { path: "data/programs.json", content: JSON.stringify(data.programs, null, 2) },
    { path: "data/media.json", content: JSON.stringify(data.media, null, 2) },
    { path: "sql/backup.sql", content: generateSqlBackup(data) },
    { path: "README.md", content: generateReadme(data) },
  ];

  const committedPaths: string[] = [];
  for (const item of filesToCommit) {
    await commitFileToGithub(repo, item.path, item.content, commitMsg, branch, token);
    committedPaths.push(item.path);
  }

  return {
    success: true,
    total_media: data.summary.total_media,
    synced_at: data.summary.last_synced_at,
    files: committedPaths,
  };
}
