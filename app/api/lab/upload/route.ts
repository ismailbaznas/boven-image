import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try {
    const r = await refreshAccessToken(refresh);
    return r.access_token;
  } catch { return access; }
}

function extractImagesFromPost(post: any): string[] {
  const urls: string[] = [];
  if (post?.images?.length) for (const im of post.images) if (im.url) urls.push(im.url);
  if (post?.content) {
    const re = /https:\/\/[^"'\s<>]+\.googleusercontent\.com\/[^"'\s<>]+/g;
    let m;
    while ((m = re.exec(post.content)) !== null) urls.push(m[0]);
    // also bp.blogspot.com
    const re2 = /https:\/\/\d+\.bp\.blogspot\.com\/[^"'\s<>]+/g;
    while ((m = re2.exec(post.content)) !== null) urls.push(m[0]);
  }
  return [...new Set(urls)];
}

async function tryJsonDataUri(token: string, blogId: string, file: File, fetchImages: boolean) {
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mime = file.type || "image/jpeg";
  const title = `LAB-JSON-${fetchImages ? "fetch" : "noFetch"}-${Date.now()}-${file.name}`;
  const html = `<div>Media Vault Lab ${new Date().toISOString()}<br/><img src="data:${mime};base64,${base64}" alt="${file.name}" /></div>`;
  const qs = new URLSearchParams({ isDraft: "true" });
  if (fetchImages) qs.set("fetchImages", "true");
  const url = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/?${qs.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "blogger#post", blog: { id: blogId }, title, content: html, labels: ["media-vault-lab"] }),
  });
  const post = await res.json();
  return { res, post, html, title, url, fetchImages, strategy: `json-datauri fetchImages=${fetchImages}` };
}

async function tryMultipart(token: string, blogId: string, file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  const title = `LAB-MULTIPART-${Date.now()}-${file.name}`;
  // Content referencing multipart image via inline placeholder - try empty content + media
  // According to google upload spec: first part is JSON metadata, second part is media
  const boundary = "MediaVaultBoundary" + Date.now();
  const metadata = {
    kind: "blogger#post",
    blog: { id: blogId },
    title,
    content: `<div>Multipart test ${new Date().toISOString()}<br/><img src="cid:image" /></div>`,
    labels: ["media-vault-lab"],
  };
  // Build multipart/related body
  const delimiter = `--${boundary}`;
  const closeDelim = `--${boundary}--`;
  const header1 = `${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const header2 = `${delimiter}\r\nContent-Type: ${mime}\r\nContent-Transfer-Encoding: binary\r\n\r\n`;
  const footer = `\r\n${closeDelim}`;
  const body = Buffer.concat([
    Buffer.from(header1, "utf-8"),
    Buffer.from(header2, "utf-8"),
    buf,
    Buffer.from(footer, "utf-8"),
  ]);

  // Try upload endpoint (docs show uploadType=multipart)
  const uploadUrl = `https://www.googleapis.com/upload/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/?isDraft=true&uploadType=multipart&fetchImages=true`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body: body as any,
  });
  let post: any;
  const text = await res.text();
  try { post = JSON.parse(text); } catch { post = { raw: text.slice(0, 4000) }; }
  return { res, post, raw: text.slice(0, 4000), title, url: uploadUrl, boundary, strategy: "multipart/related uploadType=multipart" };
}

async function tryExternalFetch(token: string, blogId: string) {
  // Try inserting post with external image URL that Blogger might fetch & rehost when fetchImages=true
  // Use a known public image (picsum)
  const extUrl = "https://picsum.photos/seed/mediavault/600/400";
  const title = `LAB-EXT-FETCH-${Date.now()}`;
  const html = `<div>External fetch test ${new Date().toISOString()}<br/><img src="${extUrl}" /></div>`;
  const url = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/?isDraft=true&fetchImages=true&fetchBody=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "blogger#post", blog: { id: blogId }, title, content: html, labels: ["media-vault-lab"] }),
  });
  const post = await res.json();
  return { res, post, html, extUrl, title, url, strategy: "json-external fetchImages=true" };
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const form = await req.formData();
  const blogId = (form.get("blogId") as string) || "";
  const file = form.get("file") as File | null;
  const keepPost = form.get("keepPost") === "1";
  if (!blogId) return NextResponse.json({ error: "blogId wajib" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "file wajib" }, { status: 400 });

  // Run 3 strategies in sequence
  const attempts: any[] = [];

  // A1: json datauri without fetchImages (original)
  const a1 = await tryJsonDataUri(token, blogId, file, false);
  attempts.push({
    strategy: a1.strategy,
    status: a1.res.status,
    ok: a1.res.ok,
    postId: a1.post?.id,
    imageUrls: extractImagesFromPost(a1.post),
    contentSnippet: a1.post?.content?.slice(0, 800),
    raw: a1.post,
  });

  // A2: json datauri with fetchImages=true - critical test from docs fetchImages
  const a2 = await tryJsonDataUri(token, blogId, file, true);
  attempts.push({
    strategy: a2.strategy,
    status: a2.res.status,
    ok: a2.res.ok,
    postId: a2.post?.id,
    imageUrls: extractImagesFromPost(a2.post),
    contentSnippet: a2.post?.content?.slice(0, 800),
    raw: a2.post,
  });

  // B: multipart
  const b = await tryMultipart(token, blogId, file);
  attempts.push({
    strategy: b.strategy,
    status: b.res.status,
    ok: b.res.ok,
    postId: b.post?.id,
    imageUrls: extractImagesFromPost(b.post),
    contentSnippet: b.post?.content?.slice(0, 800),
    raw: b.post,
    rawText: b.raw?.slice(0, 800),
    url: b.url,
  });

  // C: external fetch test
  const c = await tryExternalFetch(token, blogId);
  attempts.push({
    strategy: c.strategy,
    status: c.res.status,
    ok: c.res.ok,
    postId: c.post?.id,
    imageUrls: extractImagesFromPost(c.post),
    contentSnippet: c.post?.content?.slice(0, 800),
    raw: c.post,
    extUrl: c.extUrl,
  });

  // Determine best result (any rehosted)
  const rehostedAttempt = attempts.find((a) => a.imageUrls.length > 0);
  const imageUrls: string[] = rehostedAttempt?.imageUrls || [];
  const rehosted = imageUrls.length > 0;

  // Cleanup: delete all created posts if not keep
  let checkAfterDelete: any = null;
  let stillAliveAfterDelete: boolean | null = null;
  if (!keepPost) {
    // if rehosted, test lifetime of first image after deleting its post
    if (imageUrls.length && rehostedAttempt?.postId) {
      await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(rehostedAttempt.postId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const testUrl = imageUrls[0];
      try {
        const head = await fetch(testUrl, { method: "HEAD", cache: "no-store" });
        stillAliveAfterDelete = head.ok;
        checkAfterDelete = { url: testUrl, status: head.status, ok: head.ok };
      } catch (e: any) {
        checkAfterDelete = { url: testUrl, error: String(e) };
      }
    }
    // delete all other posts to keep blog clean (even if not rehosted)
    for (const a of attempts) {
      if (a.postId && a.postId !== rehostedAttempt?.postId) {
        await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(a.postId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
    // if keepPost false and no rehosted, still delete the last rehosted? already deleted
    // if keepPost false and we kept rehosted deleted, we already deleted it. For keepPost false we delete all.
    // If keepPost true we don't delete anything — but we already deleted above conditional only when !keepPost
  } else {
    // keepPost true: don't delete, but still report lifetime not tested
  }

  // If keepPost true, don't delete anything - we already didn't delete above for keep true case
  // Actually above we only delete when !keepPost, so ok

  return NextResponse.json({
    success: true,
    rehosted,
    attempts,
    bestAttempt: rehostedAttempt || null,
    imageUrls,
    imageCount: imageUrls.length,
    stillAliveAfterDelete,
    checkAfterDelete,
    note: rehosted
      ? `JACKPOT on ${rehostedAttempt.strategy}: Blogger me-rehost`
      : "SEMUA STRATEGI GAGAL rehost. Blogger tidak rehost data: URI maupun multipart dengan format ini. Perlu coba Picasa/Google Photos API atau upstream tmp host + fetchImages.",
  });
}
