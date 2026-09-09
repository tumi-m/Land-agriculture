import { NextRequest, NextResponse } from "next/server";
import { parseClimate } from "@/lib/climate";
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lat = Number(p.get("lat")),
    lon = Number(p.get("lon"));
  if (
    !p.has("lat") ||
    !p.has("lon") ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -35 ||
    lat > -22 ||
    lon < 16 ||
    lon > 33
  )
    return NextResponse.json(
      { error: "Choose a point inside South Africa." },
      { status: 400 },
    );
  const sourceUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon.toFixed(2)}&latitude=${lat.toFixed(2)}&format=JSON`;
  try {
    const response = await fetch(sourceUrl, {
      next: { revalidate: 2592000 },
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) throw new Error("Climate service unavailable");
    return NextResponse.json(parseClimate(await response.json(), sourceUrl), {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "NASA climate data could not be retrieved. Retry when the service is available.",
      },
      { status: 502 },
    );
  }
}
