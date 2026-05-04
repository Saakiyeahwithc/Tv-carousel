import { useState, useEffect, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth";
import { Image, Video, Trash, Grip, Tv } from "lucide-react";
import {
  getPlaylist,
  insertMedia,
  deleteMedia,
  reorderMedia,
  getMaxOrderIndex,
  updateMediaDuration,
  getMediaUrl,
} from "../api/api";
import type { MediaRecord } from "../api/api";

function generateId(): string {
  return crypto.randomUUID();
}

export default function UploadPage() {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const list = await getPlaylist();
    setItems(list);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    const maxIdx = await getMaxOrderIndex();
    let nextIdx = maxIdx + 1;

    for (const file of Array.from(files)) {
      const isPhoto = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isPhoto && !isVideo) continue;

      const id = generateId();
      await insertMedia(
        {
          id,
          filename: "", // server sets this
          original_name: file.name,
          type: isPhoto ? "photo" : "video",
          order_index: nextIdx++,
          uploaded_at: new Date().toISOString(),
          duration_ms: isPhoto ? 5000 : undefined,
        },
        file, // pass the raw File to send via FormData
      );
    }

    setUploading(false);
    refresh();
  }

  function handleDropZone(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleDelete(id: string) {
    await deleteMedia(id);
    refresh();
  }

  function handleItemDragStart(idx: number) {
    setDragIndex(idx);
  }

  function handleItemDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIndex(idx);
  }

  async function handleItemDrop(idx: number) {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    await reorderMedia(
      reordered.map((item, i) => ({ id: item.id, order_index: i })),
    );
    setDragIndex(null);
    setDragOverIndex(null);
    refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Tv />
          </div>
          <h1 className="text-lg font-semibold text-gray-800">TV Carousel</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/carousel")}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition"
          >
            Play
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        {/* Drop Zone */}
        <div
          onDrop={handleDropZone}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition
            ${dragOver ? "border-gray-800 bg-gray-100" : "border-gray-300 bg-white"}
            ${uploading ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFiles(e.target.files)
            }
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Uploading…</p>
            </div>
          ) : (
            <>
              <div className="text-3xl text-gray-400 mb-2">+</div>
              <p className="text-gray-700 font-medium">
                Drop photos & videos here
              </p>
              <p className="text-sm text-gray-400 mt-1">
                or click to browse · JPG PNG WEBP GIF MP4 WEBM MOV
              </p>
            </>
          )}
        </div>

        {/* Media Grid */}
        {items.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-md font-semibold text-gray-800">
                Playlist{" "}
                <span className="text-gray-400 text-sm">({items.length})</span>
              </h2>
              <p className="text-xs text-gray-400">Drag to reorder</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleItemDragStart(idx)}
                  onDragOver={(e) => handleItemDragOver(e, idx)}
                  onDrop={() => handleItemDrop(idx)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-move transition
                    ${dragOverIndex === idx ? "ring-2 ring-gray-800" : ""}
                  `}
                >
                  {/* Thumbnail — direct server URL, no blob needed */}
                  <div className="relative aspect-video bg-gray-100">
                    {item.type === "photo" ? (
                      <img
                        src={getMediaUrl(item.filename)}
                        alt={item.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={getMediaUrl(item.filename)}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute top-2 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {item.type === "photo" ? (
                        <Image size={12} />
                      ) : (
                        <Video size={12} />
                      )}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-sm text-gray-800 truncate">
                      {item.original_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      #{idx + 1} · {item.type}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="text-gray-400 cursor-grab">
                      <Grip />
                    </span>
                    {item.type === "photo" && (
                      <div>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={(item.duration_ms || 5000) / 1000}
                          onChange={async (e) => {
                            const seconds = Number(e.target.value);
                            if (!seconds || seconds <= 0) return;
                            await updateMediaDuration(item.id, seconds * 1000);
                            refresh();
                          }}
                          className="w-16 text-center text-xs border border-gray-300 rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <span className="text-xs text-gray-400 font-bold p-1">
                          sec
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && !uploading && (
          <div className="text-center mt-10 text-gray-400 text-sm">
            No media yet. Upload photos and videos above to get started.
          </div>
        )}
      </main>
    </div>
  );
}
