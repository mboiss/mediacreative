export type TourLeader = {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
};

export const DEFAULT_TOUR_LEADERS: TourLeader[] = [
  { id: "tl-1", name: "Komang Sudira" },
  { id: "tl-2", name: "Empong Kuswoyo" },
  { id: "tl-3", name: "Pendot" },
  { id: "tl-4", name: "Gede Suadnyana" },
  { id: "tl-5", name: "Chairul Effendi" },
  { id: "tl-6", name: "Bram Idrus" },
  { id: "tl-7", name: "Komang Karung" },
  { id: "tl-8", name: "Nurdin Nasution" },
  { id: "tl-9", name: "Nino" },
  { id: "tl-10", name: "Sofyan" },
  { id: "tl-11", name: "Linda Samosir" },
  { id: "tl-12", name: "I Ketut Sentosa" },
  { id: "tl-13", name: "Usman" },
  { id: "tl-14", name: "Agus Wiraman" },
  { id: "tl-15", name: "Sugiarto" },
  { id: "tl-16", name: "Ophan" },
  { id: "tl-17", name: "Ayu Putu" },
];

const STORAGE_KEY = "media_creative_tour_leaders";

export async function fetchTourLeaders(): Promise<TourLeader[]> {
  try {
    const res = await fetch("/api/tour-leaders");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error("Failed to fetch tour leaders from API:", err);
  }
  return getTourLeaders();
}

export function getTourLeaders(): TourLeader[] {
  if (typeof window === "undefined") return DEFAULT_TOUR_LEADERS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load tour leaders from localStorage:", e);
  }
  return DEFAULT_TOUR_LEADERS;
}

export function saveTourLeaders(leaders: TourLeader[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaders));
  } catch (e) {
    console.error("Failed to save tour leaders:", e);
  }
}
