export type Grade = "A" | "B" | "C" | "D" | "F" | "N";

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  grade: Grade;
  value: number | null;
  unit: string;
  date: string;
}

export const GRADE_COLORS: Record<Grade, string> = {
  A: "#16a34a",
  B: "#65a30d",
  C: "#d97706",
  D: "#dc2626",
  F: "#7f1d1d",
  N: "#9ca3af",
};

export const GRADE_LABELS: Record<Grade, string> = {
  A: "A — Excellent",
  B: "B — Good",
  C: "C — Fair",
  D: "D — Poor",
  F: "F — Failing",
  N: "No Data",
};

export const GRADE_RANGES: Record<Grade, string> = {
  A: "≤ 35 CFU/100mL",
  B: "36–104",
  C: "105–200",
  D: "201–500",
  F: "> 500",
  N: "",
};

export function getGrade(value: number | null): Grade {
  if (value === null || isNaN(value)) return "N";
  if (value <= 35) return "A";
  if (value <= 104) return "B";
  if (value <= 200) return "C";
  if (value <= 500) return "D";
  return "F";
}

export async function fetchWaterQualityData(): Promise<Station[]> {
  const res = await fetch("/api/water-quality");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Request failed with status ${res.status}`
    );
  }
  return res.json() as Promise<Station[]>;
}
