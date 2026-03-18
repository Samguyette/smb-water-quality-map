export type Status = "pass" | "advisory" | "closed" | "unknown";

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: Status;
  location: string;
  inspectionDay: string;
}

export const STATUS_COLORS: Record<Status, string> = {
  pass: "#16a34a",
  advisory: "#d97706",
  closed: "#dc2626",
  unknown: "#9ca3af",
};

export const STATUS_LABELS: Record<Status, string> = {
  pass: "Meets State Standards",
  advisory: "Elevated Bacteria",
  closed: "Closed",
  unknown: "No Data",
};

export async function fetchWaterQualityData(): Promise<{
  stations: Station[];
  updatedAt: string;
}> {
  const res = await fetch("/api/water-quality");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Request failed with status ${res.status}`
    );
  }
  return res.json();
}
