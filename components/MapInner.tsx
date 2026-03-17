"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
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
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    fetchWaterQualityData()
      .then((data) => {
        setStations(data);
        setLastUpdated(
          new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-5 h-14 border-b bg-white shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <WaveDot />
          <h1 className="text-sm font-semibold tracking-tight">
            Santa Monica Bay Water Quality
          </h1>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
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
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-sm text-muted-foreground">
                Fetching water quality data…
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-white">
            <div className="text-center space-y-3 max-w-xs px-4">
              <p className="text-sm font-medium">Unable to load data</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Leaflet map */}
        <MapContainer
          center={[33.95, -118.45]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {stations.map((station) => (
            <CircleMarker
              key={station.id}
              center={[station.lat, station.lng]}
              radius={11}
              fillColor={GRADE_COLORS[station.grade]}
              color="white"
              weight={2}
              opacity={1}
              fillOpacity={0.88}
            >
              <Popup minWidth={200} maxWidth={260}>
                <StationPopup station={station} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* ── Legend ── */}
        {!loading && !error && (
          <div className="absolute bottom-8 left-4 z-[1000] bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-md px-4 py-3 text-xs">
            <p className="font-medium text-[10px] uppercase tracking-widest text-zinc-400 mb-2.5">
              Water Quality
            </p>
            <div className="space-y-1.5">
              {LEGEND_GRADES.map((grade) => (
                <div key={grade} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: GRADE_COLORS[grade] }}
                  />
                  <span className="text-zinc-700 font-medium">
                    {GRADE_LABELS[grade]}
                  </span>
                  {GRADE_RANGES[grade] && (
                    <span className="text-zinc-400 ml-auto pl-3 tabular-nums">
                      {GRADE_RANGES[grade]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[10px] text-zinc-400 leading-relaxed">
              CA Beach Action Value: 104 CFU/100mL
              <br />
              Source: EPA Water Quality Portal
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && stations.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-zinc-200 rounded-lg shadow-sm px-4 py-2.5 text-xs text-zinc-600">
            No Enterococcus monitoring data found for the past 12 months.
          </div>
        )}
      </div>
    </div>
  );
}

function StationPopup({ station }: { station: Station }) {
  return (
    <div className="p-4 space-y-3 font-sans">
      {/* Station name */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide leading-tight">
        {station.name}
      </p>

      {/* Grade badge */}
      <div className="flex items-center gap-3">
        <span
          className="text-4xl font-bold tabular-nums leading-none"
          style={{ color: GRADE_COLORS[station.grade] }}
        >
          {station.grade === "N" ? "–" : station.grade}
        </span>
        <div className="text-xs text-zinc-500 leading-snug">
          <p className="font-medium text-zinc-700">
            {GRADE_LABELS[station.grade]}
          </p>
          {GRADE_RANGES[station.grade] && (
            <p>{GRADE_RANGES[station.grade]}</p>
          )}
        </div>
      </div>

      {/* Sample data */}
      {(station.value !== null || station.date) && (
        <div className="text-xs text-zinc-500 space-y-0.5 border-t border-zinc-100 pt-2.5">
          {station.value !== null && (
            <p>
              <span className="text-zinc-400">Count </span>
              <span className="text-zinc-700 font-medium tabular-nums">
                {station.value.toLocaleString()} {station.unit}
              </span>
            </p>
          )}
          {station.date && (
            <p>
              <span className="text-zinc-400">Sampled </span>
              <span className="text-zinc-700">
                {formatDate(station.date)}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Advisory link */}
      <a
        href="http://publichealth.lacounty.gov/beach"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[11px] text-blue-600 hover:text-blue-800 underline underline-offset-2"
      >
        LA County DPH Beach Advisories →
      </a>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
  );
}
