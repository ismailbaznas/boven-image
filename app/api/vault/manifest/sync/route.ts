import { NextRequest, NextResponse } from "next/server";
import { syncManifestToGitHub, fetchCatalogData } from "@/lib/manifest";

export async function GET() {
  try {
    const data = await fetchCatalogData();
    return NextResponse.json({
      status: "ready",
      summary: data.summary,
      manifest_repo: process.env.GITHUB_MANIFEST_REPO || "ismailbaznas/boven-image-manifest",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch catalog" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await syncManifestToGitHub();
    return NextResponse.json({
      success: true,
      message: `Manifest successfully synced to GitHub (${result.total_media} media)`,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to sync manifest to GitHub",
      },
      { status: 500 }
    );
  }
}
