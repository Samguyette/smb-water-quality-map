import { NextResponse } from "next/server";
import { getGrade } from "@/lib/waterQuality";
import type { Station } from "@/lib/waterQuality";

export const dynamic = "force-dynamic";

const BBOX = "-118.75,33.7,-118.2,34.05";
const BASE = "https://www.waterqualitydata.us/data";

export async function GET() {
  try {
    // Fetch stations and results in parallel.
    // Coordinates live in the Station endpoint; bacteria counts in Result.
    const [stationCsv, resultCsv] = await Promise.all([
      wqpFetch(
        `${BASE}/Station/search?bBox=${BBOX}&characteristicName=Enterococcus&mimeType=csv&zip=no`
      ),
      wqpFetch(
        `${BASE}/Result/search?bBox=${BBOX}&characteristicName=Enterococcus&startDateLo=${getPastDate(12)}&mimeType=csv&zip=no`
      ),
    ]);

    const coordMap = parseStations(stationCsv);
    const stations = parseResults(resultCsv, coordMap);

    return NextResponse.json(stations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("water-quality route error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function wqpFetch(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WQP returned ${res.status} for ${url}`);
  return res.text();
}

function getPastDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getFullYear()}`;
}

/** Returns a map of MonitoringLocationIdentifier → { lat, lng, name } */
function parseStations(
  csv: string
): Map<string, { lat: number; lng: number; name: string }> {
  const map = new Map<string, { lat: number; lng: number; name: string }>();
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return map;

  const headers = splitCSVRow(lines[0]);
  const col = (name: string) => headers.findIndex((h) => h.trim() === name);

  const idCol = col("MonitoringLocationIdentifier");
  const nameCol = col("MonitoringLocationName");
  const latCol = col("LatitudeMeasure");
  const lngCol = col("LongitudeMeasure");

  if (idCol === -1 || latCol === -1 || lngCol === -1) {
    console.error("Station CSV missing expected columns. Headers:", headers.slice(0, 20));
    return map;
  }

  for (let i = 1; i < lines.length; i++) {
    const c = splitCSVRow(lines[i]);
    const id = c[idCol]?.trim() ?? "";
    if (!id) continue;

    const lat = parseFloat(c[latCol]?.trim() ?? "");
    const lng = parseFloat(c[lngCol]?.trim() ?? "");
    if (isNaN(lat) || isNaN(lng)) continue;

    const rawName = nameCol >= 0 ? (c[nameCol]?.trim() ?? "") : "";
    map.set(id, { lat, lng, name: rawName || humanizeName(id) });
  }

  return map;
}

/** Parses results CSV, joins with coord map, deduplicates to most recent per station. */
function parseResults(
  csv: string,
  coordMap: Map<string, { lat: number; lng: number; name: string }>
): Station[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVRow(lines[0]);
  const col = (name: string) => headers.findIndex((h) => h.trim() === name);

  const idCol = col("MonitoringLocationIdentifier");
  const dateCol = col("ActivityStartDate");
  const valueCol = col("ResultMeasureValue");
  const unitCol = col("ResultMeasure/MeasureUnitCode");

  if (idCol === -1) {
    console.error("Result CSV missing MonitoringLocationIdentifier. Headers:", headers.slice(0, 20));
    return [];
  }

  const stationMap = new Map<string, Station>();

  for (let i = 1; i < lines.length; i++) {
    const c = splitCSVRow(lines[i]);
    const id = c[idCol]?.trim() ?? "";
    if (!id) continue;

    const coords = coordMap.get(id);
    if (!coords) continue; // no coordinates for this station

    const date = dateCol >= 0 ? (c[dateCol]?.trim() ?? "") : "";
    const rawVal = valueCol >= 0 ? c[valueCol]?.trim() : "";
    const value = rawVal ? parseFloat(rawVal) : null;
    const unit = (unitCol >= 0 ? c[unitCol]?.trim() : "") || "CFU/100mL";

    const existing = stationMap.get(id);
    if (!existing || date > existing.date) {
      stationMap.set(id, {
        id,
        name: coords.name,
        lat: coords.lat,
        lng: coords.lng,
        grade: getGrade(value !== null && !isNaN(value) ? value : null),
        value: value !== null && !isNaN(value) ? value : null,
        unit: normalizeUnit(unit),
        date,
      });
    }
  }

  return Array.from(stationMap.values());
}

function splitCSVRow(row: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

function humanizeName(id: string): string {
  return id
    .replace(/^CABEACH_WQX-/, "")
    .replace(/^21LACOUNTY-/, "")
    .replace(/^LACBOS-/, "")
    .replace(/^LACOUNTYDHS-/, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim();
}

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase();
  if (u.includes("mpn")) return "MPN/100mL";
  if (u.includes("cfu")) return "CFU/100mL";
  return raw.trim() || "CFU/100mL";
}
