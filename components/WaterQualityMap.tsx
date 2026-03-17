"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex flex-col">
      <header className="flex items-center px-5 h-14 border-b bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <WaveDot />
          <h1 className="text-sm font-semibold tracking-tight">
            Santa Monica Bay Water Quality
          </h1>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-muted-foreground">
            Fetching water quality data…
          </p>
        </div>
      </div>
    </div>
  ),
});

export default function WaterQualityMap() {
  return <MapInner />;
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
