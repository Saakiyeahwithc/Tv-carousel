import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaylist, getMediaUrl } from "../db/api";
import type { MediaRecord } from "../db/api";

interface PlaylistItem extends MediaRecord {
  objectUrl: string;
}

export default function CarouselPage() {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [fading, setFading] = useState(false);
  const [nextIndex, setNextIndex] = useState(0);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const playlist = await getPlaylist(); // now async
      const loadedItems: PlaylistItem[] = playlist.map((item) => ({
        ...item,
        objectUrl: getMediaUrl(item.filename), // direct server URL, no blob needed
      }));
      setItems(loadedItems);
      setLoaded(true);
    }
    load();
    return () => {
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current);
      // No URLs to revoke — server URLs don't need cleanup
    };
  }, []);

  const advance = useCallback((items: PlaylistItem[], from: number) => {
    if (items.length === 0) return;
    const next = (from + 1) % items.length;
    setFading(true);
    setNextIndex(next);
    setTimeout(() => {
      setCurrentIndex(next);
      setFading(false);
    }, 600);
  }, []);

  useEffect(() => {
    if (!loaded || items.length === 0) return;
    const current = items[currentIndex];
    if (!current) return;

    if (current.type === "photo") {
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current);
      const duration =
        current.duration_ms && current.duration_ms > 0
          ? current.duration_ms
          : 5000;
      photoTimerRef.current = setTimeout(() => {
        advance(items, currentIndex);
      }, duration);
      return () => {
        if (photoTimerRef.current) clearTimeout(photoTimerRef.current);
      };
    }
  }, [currentIndex, loaded, items, advance]);

  useEffect(() => {
    if (!loaded || items.length === 0) return;
    const current = items[currentIndex];
    if (current?.type === "video" && videoRef.current) {
      const video = videoRef.current;
      video.src = current.objectUrl; // now a plain http URL
      video.load();
      video.play().catch(() => {});
    }
  }, [currentIndex, loaded, items]);

  function handleVideoEnded() {
    advance(items, currentIndex);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") navigate("/upload");
    }
    function onClick() {
      navigate("/upload");
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [navigate]);

  if (!loaded) {
    return (
      <div className="carousel-loading">
        <div className="spinner white" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="carousel-empty">
        <p>No media yet</p>
        <span>Click to go to upload page</span>
      </div>
    );
  }

  const current = items[currentIndex];
  const next = items[nextIndex];

  return (
    <div className="carousel">
      <div className={`carousel-slide ${fading ? "fade-out" : "fade-in"}`}>
        {current.type === "photo" ? (
          <img
            key={current.id}
            src={current.objectUrl}
            className="carousel-media h-screen w-full object-cover"
            alt=""
          />
        ) : (
          <video
            key={current.id}
            ref={videoRef}
            className="carousel-media object-cover w-full h-screen"
            controls
            autoPlay
            playsInline
            onEnded={handleVideoEnded}
          />
        )}
      </div>

      {fading && next && next.type === "photo" && (
        <div className="carousel-slide fade-in-bg">
          <img src={next.objectUrl} className="carousel-media" alt="" />
        </div>
      )}

      <div className="carousel-dots">
        {items.map((_, i) => (
          <div
            key={i}
            className={`carousel-dot ${i === currentIndex ? "active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
