const BASE = "";

export interface MediaRecord {
  id: string;
  filename: string;
  original_name: string;
  type: "photo" | "video";
  order_index: number;
  uploaded_at: string;
  duration_ms?: number;
}

export function getMediaUrl(filename: string): string {
  return `${BASE}/uploads/${filename}`; // replaces getMediaFileData()
}

export async function getPlaylist(): Promise<MediaRecord[]> {
  const res = await fetch(`${BASE}/api/media`);
  return res.json();
}

export async function getMediaById(id: string): Promise<MediaRecord | null> {
  const res = await fetch(`${BASE}/api/media/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getMaxOrderIndex(): Promise<number> {
  const res = await fetch(`${BASE}/api/media/max-order`);
  const data = await res.json();
  return data.max;
}

export async function insertMedia(
  record: MediaRecord,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("id", record.id);
  formData.append("original_name", record.original_name);
  formData.append("type", record.type);
  formData.append("order_index", String(record.order_index));
  formData.append("uploaded_at", record.uploaded_at);
  formData.append("duration_ms", String(record.duration_ms ?? 5000));

  await fetch(`${BASE}/api/media`, { method: "POST", body: formData });
}

export async function deleteMedia(id: string): Promise<void> {
  await fetch(`${BASE}/api/media/${id}`, { method: "DELETE" });
}

export async function reorderMedia(
  items: { id: string; order_index: number }[],
): Promise<void> {
  await fetch(`${BASE}/api/media/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
}

export async function updateMediaDuration(
  id: string,
  duration_ms: number,
): Promise<void> {
  await fetch(`${BASE}/api/media/${id}/duration`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration_ms }),
  });
}
