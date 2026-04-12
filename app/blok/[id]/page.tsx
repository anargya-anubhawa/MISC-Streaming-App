"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { guardUser } from "../../../lib/authGuard";
import { db } from "../../../lib/firebase";
import { getDateValue } from "../../../lib/date";
import { getYouTubeThumbnailUrl, normalizeYouTubeId } from "../../../lib/youtube";
import type { BlockRecord, VideoRecord } from "../../../lib/types";

type VideoSortMode = "name" | "recent";

function sortVideos(videos: VideoRecord[], sortMode: VideoSortMode) {
  return [...videos].sort((a, b) => {
    if (sortMode === "name") {
      return a.title.localeCompare(b.title);
    }

    if (sortMode === "recent") {
      const first =
        getDateValue(a.updatedAt)?.getTime() ||
        getDateValue(a.createdAt)?.getTime() ||
        0;
      const second =
        getDateValue(b.updatedAt)?.getTime() ||
        getDateValue(b.createdAt)?.getTime() ||
        0;
      return second - first;
    }

    return 0;
  });
}

export default function BlokPage() {
  const params = useParams();
  const blockId = params.id as string;
  const [block, setBlock] = useState<BlockRecord | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<VideoSortMode>("recent");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  

  useEffect(() => {
    const fetchVideos = async () => {
      const user = await guardUser({ requireUnlock: true });
      if (!user) return;

      // Nama blok dan daftar videonya diambil bersamaan agar halaman terasa utuh.
      const [blockSnap, videosSnap] = await Promise.all([
        getDoc(doc(db, "blocks", blockId)),
        getDocs(
          query(
            collection(db, "videos"),
            where("blockId", "==", blockId),
            where("isActive", "==", true)
          )
        ),
      ]);

      const list = videosSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as VideoRecord)
        .map((video) => ({
          ...video,
          youtubeId: normalizeYouTubeId(video.youtubeId),
        }))
        .filter((video) => Boolean(video.youtubeId));

      if (blockSnap.exists()) {
        setBlock({ id: blockSnap.id, ...blockSnap.data() } as BlockRecord);
      }

      setVideos(sortVideos(list, "recent"));
      setIsCheckingAuth(false);
    };

    void fetchVideos();
  }, [blockId]);

  const filteredVideos = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const searched = !keyword
      ? videos
      : videos.filter((video) => {
          const haystack = `${video.title} ${video.description || ""} ${
            video.uploadedBy || ""
          }`.toLowerCase();

          return haystack.includes(keyword);
        });

    return sortVideos(searched, sortMode);
  }, [search, sortMode, videos]);

  if (isCheckingAuth) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Header blok aktif */}
      <section className="dashboard-shell">
        <div className="dashboard-shell-header">
          <div className="space-y-3">
            <p className="dashboard-breadcrumb">
              {`MISC / Dashboard / ${block?.name || "Loading..."}`}
            </p>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-white">
                {block?.name || "Memuat blok..."}
              </h1>
              <p className="dashboard-subtitle">
                {block?.description?.trim() ||
                  "Cari video yang ingin kamu tonton, lanjutkan materi, dan masuk ke watch page dengan lebih cepat."}
              </p>
            </div>
          </div>

          <div className="dashboard-user-card">
            <p className="dashboard-user-label">DETAIL BLOK</p>
            <p className="dashboard-user-name">{videos.length} video tersedia </p>
            <p className="dashboard-user-meta">
              {filteredVideos.length} video yang dapat ditonton
            </p>
            <div className="dashboard-user-chip-row">
              <span className="text-xs">Dilarang keras membajak dan membagikan video yang terindeks di website ini tanpa terkecuali. </span>
            </div>
          </div>
        </div>

        <div className="dashboard-search-row">
          <label className="dashboard-search">
            <span className="dashboard-search-icon">Cari</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul video, deskripsi, atau nama dokter"
              className="dashboard-search-input"
            />
          </label>

          <label className="dashboard-sort">
            <span className="dashboard-search-icon">Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as VideoSortMode)}
              className="dashboard-sort-input"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">By Name</option>
            </select>
          </label>

          <div className="dashboard-info-pill">
            <span>{filteredVideos.length} hasil ditampilkan</span>
          </div>
        </div>
      </section>

      {/* Grid daftar video */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredVideos.map((video) => (
          <Link key={video.id} href={`/watch/${video.youtubeId}`}>
            <article className="video-list-card">
              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src={getYouTubeThumbnailUrl(video.youtubeId)}
                  alt={video.title}
                  width={480}
                  height={270}
                  className="video-list-thumb"
                />
                <div className="video-list-overlay">
                  <span className="video-list-watch">Tonton sekarang</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="video-list-title">{video.title}</h2>
                <p className="video-list-meta">
                  {video.uploadedBy || "Uploader tidak diketahui"}
                </p>
                <p className="video-list-description">
                  {video.description || "Belum ada deskripsi."}
                </p>
              </div>
            </article>
          </Link>
        ))}
      </section>

      {!filteredVideos.length && (
        <div className="empty-state-card">
          <p className="empty-state-title">Video tidak ditemukan</p>
          <p className="empty-state-body">
            Coba kata kunci lain atau kosongkan pencarian untuk melihat seluruh
            video dalam blok ini.
          </p>
        </div>
      )}
    </div>
  );
}
