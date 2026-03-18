"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  fetchWaterQualityData,
  Station,
  Grade,
  GRADE_COLORS,
  GRADE_LABELS,
  GRADE_RANGES,
} from "@/lib/waterQuality";

const LEGEND_GRADES: Grade[] = ["A", "B", "C", "D", "F", "N"];

export default function MapInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    let map: import("maplibre-gl").Map;

    const init = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      const data = await fetchWaterQualityData();
      setStations(data);
      setLastUpdated(
        new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      );
      setLoading(false);

      map = new maplibregl.Map({
        container: containerRef.current!,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [-118.45, 33.95],
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: data.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
          properties: { ...s },
        })),
      };

      map.on("load", () => {
        map.addSource("stations", { type: "geojson", data: geojson });

        const colorExpr: unknown[] = ["match", ["get", "grade"]];
        for (const [grade, color] of Object.entries(GRADE_COLORS)) {
          colorExpr.push(grade, color);
        }
        colorExpr.push("#9ca3af");

        map.addLayer({
          id: "stations-layer",
          type: "circle",
          source: "stations",
          paint: {
            "circle-radius": 11,
            "circle-color": colorExpr as unknown as string,
            "circle-stroke-color": "rgba(255,255,255,0.7)",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.88,
          },
        });

        map.on("click", "stations-layer", (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties as Station;
          const coords = (
            e.features[0].geometry as GeoJSON.Point
          ).coordinates as [number, number];
          new maplibregl.Popup({ maxWidth: "260px" })
            .setLngLat(coords)
            .setHTML(buildPopupHTML(props))
            .addTo(map);
        });

        map.on("mouseenter", "stations-layer", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "stations-layer", () => {
          map.getCanvas().style.cursor = "";
        });
      });
    };

    init().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });

    return () => map?.remove();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-5 h-14 border-b bg-zinc-950 border-zinc-800 shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <WaveDot />
          <h1 className="text-sm font-semibold tracking-tight text-white">
            Santa Monica Bay Water Quality
          </h1>
        </div>
        <span className="text-xs text-zinc-500 tabular-nums">
          {loading
            ? "Loading data…"
            : error
              ? "Failed to load"
              : lastUpdated
                ? `Updated ${lastUpdated}`
                : ""}
        </span>
      </header>

      {/* ── Map Area ── */}
      <div className="relative flex-1">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-zinc-950">
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-sm text-zinc-400">
                Fetching water quality data…
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-zinc-950">
            <div className="text-center space-y-3 max-w-xs px-4">
              <p className="text-sm font-medium text-white">
                Unable to load data
              </p>
              <p className="text-xs text-zinc-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />

        {/* ── Legend ── */}
        {!loading && !error && (
          <div className="absolute bottom-8 left-4 z-[1000] bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-3 text-xs">
            <p className="font-medium text-[10px] uppercase tracking-widest text-white/40 mb-2.5">
              Water Quality
            </p>
            <div className="space-y-1.5">
              {LEGEND_GRADES.map((grade) => (
                <div key={grade} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: GRADE_COLORS[grade] }}
                  />
                  <span className="text-white/70 font-medium">
                    {GRADE_LABELS[grade]}
                  </span>
                  {GRADE_RANGES[grade] && (
                    <span className="text-white/30 ml-auto pl-3 tabular-nums">
                      {GRADE_RANGES[grade]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-white/30 leading-relaxed">
              CA Beach Action Value: 104 CFU/100mL
              <br />
              Source: EPA Water Quality Portal
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && stations.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 border border-white/10 rounded-lg shadow-sm px-4 py-2.5 text-xs text-white/60">
            No Enterococcus monitoring data found for the past 12 months.
          </div>
        )}
      </div>
    </div>
  );
}

function buildPopupHTML(station: Station): string {
  const color = GRADE_COLORS[station.grade];
  const label = GRADE_LABELS[station.grade];
  const range = GRADE_RANGES[station.grade];
  const gradeDisplay = station.grade === "N" ? "–" : station.grade;

  const sampleRows =
    station.value !== null || station.date
      ? `<div style="font-size:11px;border-top:1px solid #f3f4f6;padding-top:10px;margin-top:10px;">
          ${station.value !== null ? `<p style="margin:0 0 3px"><span style="color:#9ca3af">Count </span><span style="color:#374151;font-weight:600">${station.value.toLocaleString()} ${station.unit}</span></p>` : ""}
          ${station.date ? `<p style="margin:0"><span style="color:#9ca3af">Sampled </span><span style="color:#374151">${formatDate(station.date)}</span></p>` : ""}
        </div>`
      : "";

  return `
    <div style="padding:14px;font-family:system-ui,sans-serif;min-width:180px;">
      <p style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px">${station.name}</p>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:34px;font-weight:700;color:${color};line-height:1">${gradeDisplay}</span>
        <div style="font-size:11px;color:#6b7280">
          <p style="margin:0 0 2px;font-weight:500;color:#374151">${label}</p>
          ${range ? `<p style="margin:0">${range}</p>` : ""}
        </div>
      </div>
      ${sampleRows}
      <a href="http://publichealth.lacounty.gov/beach" target="_blank" rel="noopener noreferrer"
         style="display:block;font-size:10px;color:#2563eb;text-decoration:underline;margin-top:10px">
        LA County DPH Beach Advisories →
      </a>
    </div>
  `;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );
}

function WaveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
    </span>
  );
}

function Spinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
  );
}
