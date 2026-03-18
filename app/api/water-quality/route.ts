import { NextResponse } from "next/server";
import type { Station, Status } from "@/lib/waterQuality";

export const dynamic = "force-dynamic";

const KML_URL =
  "https://www.google.com/maps/d/kml?mid=1hrin1gMc6ok2dKu9d1i9szZKC6Y&forcekml=1";

const COLOR_TO_STATUS: Record<string, Status> = {
  "009D57": "pass",
  F4EB37: "advisory",
  FFFFFF: "unknown",
};

export async function GET() {
  try {
    const res = await fetch(KML_URL);
    if (!res.ok) throw new Error(`KML fetch returned ${res.status}`);
    const kml = await res.text();

    const updatedAt =
      kml.match(/<Folder>\s*<name>([^<]+)<\/name>/)?.[1]?.trim() ?? "";
    const stations = parsePlacemarks(kml);

    return NextResponse.json({ stations, updatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("water-quality route error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parsePlacemarks(kml: string): Station[] {
  const stations: Station[] = [];
  const re = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let match;

  while ((match = re.exec(kml)) !== null) {
    const block = match[1];

    const name = block.match(/<name>([^<]+)<\/name>/)?.[1]?.trim() ?? "";
    const styleUrl = block.match(/<styleUrl>#([^<]+)<\/styleUrl>/)?.[1] ?? "";
    const coords =
      block
        .match(/<coordinates>\s*([\d\-.]+),([\d\-.]+)/)?.[0]
        ?.match(/<coordinates>\s*([\d\-.]+),([\d\-.]+)/) ?? null;

    if (!name || !coords) continue;

    const lng = parseFloat(coords[1]);
    const lat = parseFloat(coords[2]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const colorMatch = styleUrl.match(/icon-\d+-([A-Fa-f0-9]+)-/);
    const color = colorMatch?.[1]?.toUpperCase() ?? "";
    const status: Status = COLOR_TO_STATUS[color] ?? "unknown";

    const location = extractField(block, "Location");
    const stationNo = extractField(block, "Station No.");
    const freq = extractField(block, "Inspection Frequency");

    stations.push({
      id: stationNo || name,
      name,
      lat,
      lng,
      status,
      location,
      inspectionDay: freq.split(",")[0].trim(),
    });
  }

  return stations;
}

function extractField(block: string, fieldName: string): string {
  const escaped = fieldName.replace(".", "\\.");
  const m = block.match(
    new RegExp(`<Data name="${escaped}">\\s*<value>([^<]*)<\\/value>`)
  );
  return m?.[1]?.trim() ?? "";
}
