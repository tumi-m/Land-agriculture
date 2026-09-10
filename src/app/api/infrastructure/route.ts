import { NextRequest, NextResponse } from "next/server";
import {
  INFRASTRUCTURE,
  infrastructureQuery,
  parseInfrastructureBounds,
  parseInfrastructure,
  type InfrastructureKind,
} from "@/lib/infrastructure";
export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("layer") as InfrastructureKind;
  let bounds: [number, number, number, number];
  try {
    if (!Object.hasOwn(INFRASTRUCTURE, kind))
      throw new Error("Unknown infrastructure layer.");
    bounds = parseInfrastructureBounds(
      request.nextUrl.searchParams.get("bbox"),
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const response = await fetch(infrastructureQuery(kind, bounds), {
      next: { revalidate: 43200 },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) throw new Error("Service unavailable");
    // Bound external payloads before decoding inside the Worker.
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Missing response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2500000) {
        await reader.cancel();
        throw new Error("Zoom closer for a smaller response");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const result = parseInfrastructure(
      JSON.parse(new TextDecoder().decode(bytes)),
      kind,
    );
    return NextResponse.json(
      { ...result, source: INFRASTRUCTURE[kind] },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=43200" } },
    );
  } catch {
    return NextResponse.json(
      {
        error: `${INFRASTRUCTURE[kind].name} could not load. Zoom closer or retry; land information remains available.`,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
