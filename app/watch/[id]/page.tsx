"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { guardUser } from "../../../lib/authGuard";
import { db } from "../../../lib/firebase";
import { formatDate } from "../../../lib/date";
import { getYouTubeThumbnailUrl, normalizeYouTubeId } from "../../../lib/youtube";
import type {
  AppUserRecord,
  CommentRecord,
  ReactionType,
  VideoRecord,
} from "../../../lib/types";

type ViewerData = AppUserRecord & { uid: string };
type VideoState = VideoRecord | null;

interface YouTubePlayer {
  playVideo?: () => void;
  pauseVideo?: () => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume?: (volume: number) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        id: string,
        options: {
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: () => void;
            onStateChange: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function WatchPage() {
  const params = useParams();
  const routeVideoId =
    normalizeYouTubeId(params.id as string) || (params.id as string);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const [video, setVideo] = useState<VideoState>(null);
  const [related, setRelated] = useState<VideoRecord[]>([]);
  const [userData, setUserData] = useState<ViewerData | null>(null);
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playerReady, setPlayerReady] = useState(false);

  const loadComments = async () => {
    const commentsQuery = query(
      collection(db, "comments"),
      where("videoId", "==", routeVideoId)
    );
    const snap = await getDocs(commentsQuery);

    const commentList = snap.docs
      .map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CommentRecord
      )

    setComments(commentList);
  };

  useEffect(() => {
    const init = async () => {
      const user = await guardUser();
      if (!user) return;

      const userSnap = await getDoc(doc(db, "users", user.uid));
      setUserData({ ...(userSnap.data() as AppUserRecord), uid: user.uid });

      // Fallback scan ini dipertahankan agar data lama yang tersimpan
      // sebagai URL YouTube penuh masih tetap terbaca.
      const videosSnap = await getDocs(collection(db, "videos"));
      const videos = videosSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as VideoRecord)
        .map((item) => ({
          ...item,
          youtubeId: normalizeYouTubeId(item.youtubeId),
        }))
        .filter((item) => Boolean(item.youtubeId));

      const currentVideo = videos.find(
        (item) => item.youtubeId === routeVideoId && item.isActive
      );

      if (!currentVideo) {
        setVideo(null);
        return;
      }

      setVideo(currentVideo);
      setRelated(
        videos.filter(
          (item) =>
            item.blockId === currentVideo.blockId &&
            item.youtubeId !== routeVideoId &&
            item.isActive
        )
      );

      const reactionQuery = query(
        collection(db, "videoReactions"),
        where("videoId", "==", routeVideoId),
        where("userId", "==", user.uid)
      );
      const commentsQuery = query(
        collection(db, "comments"),
        where("videoId", "==", routeVideoId)
      );

      const [reactionSnap, commentsSnap] = await Promise.all([
        getDocs(reactionQuery),
        getDocs(commentsQuery),
      ]);

      setReaction(
        reactionSnap.empty
          ? null
          : (reactionSnap.docs[0].data().type as ReactionType)
      );

      const commentList = commentsSnap.docs
        .map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CommentRecord
        )

      setComments(commentList);
    };

    void init();
  }, [routeVideoId]);

  useEffect(() => {
    // Header global disembunyikan saat fullscreen player aktif.
    if (fullscreen) {
      document.body.classList.add("watch-fullscreen");
    } else {
      document.body.classList.remove("watch-fullscreen");
    }

    return () => {
      document.body.classList.remove("watch-fullscreen");
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!video) return;

    const mountPlayer = () => {
      if (!window.YT?.Player) return;

      playerRef.current = new window.YT.Player("yt-player", {
        videoId: video.youtubeId,
        playerVars: { controls: 0, disablekb: 1, rel: 0 },
        events: {
          onReady: () => {
            setPlayerReady(true);
            setDuration(playerRef.current?.getDuration?.() || 0);
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === 1);
          },
        },
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = mountPlayer;
  }, [video]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!playerReady || !playerRef.current) return;

      setCurrentTime(playerRef.current.getCurrentTime?.() || 0);
      setDuration(playerRef.current.getDuration?.() || 0);
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [playerReady]);

  useEffect(() => {
    let timeoutId = 0;

    const reset = () => {
      setShowUI(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setShowUI(false), 3000);
    };

    window.addEventListener("mousemove", reset);
    window.addEventListener("touchstart", reset);
    reset();

    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("touchstart", reset);
      window.clearTimeout(timeoutId);
    };
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo?.();
      return;
    }

    playerRef.current.playVideo?.();
  };

  const seekBy = (seconds: number) => {
    if (!playerRef.current?.seekTo) return;

    const nextTime = Math.min(
      Math.max(currentTime + seconds, 0),
      Math.max(duration, 0)
    );

    playerRef.current.seekTo(nextTime, true);
    setCurrentTime(nextTime);
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current?.seekTo || !progressRef.current || duration <= 0)
      return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    playerRef.current.seekTo(percent * duration, true);
  };

  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    playerRef.current?.setVolume?.(nextVolume);
  };

  const handleReaction = async (type: ReactionType) => {
    if (!userData || !video || video === null) return;

    const reactionQuery = query(
      collection(db, "videoReactions"),
      where("videoId", "==", routeVideoId),
      where("userId", "==", userData.uid)
    );

    const snap = await getDocs(reactionQuery);
    const videoRef = doc(db, "videos", video.id);
    let newLikes = video.likes || 0;
    let newDislikes = video.dislikes || 0;

    if (!snap.empty) {
      const reactionRef = snap.docs[0].ref;
      const previousType = snap.docs[0].data().type as ReactionType;

      if (previousType === type) {
        await deleteDoc(reactionRef);

        if (type === "like") newLikes--;
        if (type === "dislike") newDislikes--;

        setReaction(null);
      } else {
        await updateDoc(reactionRef, { type });

        if (previousType === "like") newLikes--;
        if (previousType === "dislike") newDislikes--;
        if (type === "like") newLikes++;
        if (type === "dislike") newDislikes++;

        setReaction(type);
      }
    } else {
      await addDoc(collection(db, "videoReactions"), {
        videoId: routeVideoId,
        userId: userData.uid,
        type,
      });

      if (type === "like") newLikes++;
      if (type === "dislike") newDislikes++;

      setReaction(type);
    }

    await updateDoc(videoRef, {
      likes: newLikes,
      dislikes: newDislikes,
    });

    setVideo({
      ...video,
      likes: newLikes,
      dislikes: newDislikes,
    });
  };

  const addComment = async () => {
    if (!userData || !commentText.trim()) return;

    await addDoc(collection(db, "comments"), {
      videoId: routeVideoId,
      userId: userData.uid,
      userEmail: userData.email,
      text: commentText.trim(),
      createdAt: new Date(),
    });

    setCommentText("");
    await loadComments();
  };

  const deleteComment = async (commentId: string, ownerId: string) => {
    if (!userData) return;
    if (userData.uid !== ownerId && userData.role !== "admin") return;

    await deleteDoc(doc(db, "comments", commentId));
    await loadComments();
  };

  if (!video) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Area player dan kontrol custom */}
      <div
        className={`${fullscreen ? "fixed inset-0 z-[99999] bg-black" : "relative"} flex justify-center`}
      >
        <div
          className={
            fullscreen
              ? "w-full h-full"
              : "w-full max-w-4xl aspect-video rounded-xl overflow-hidden"
          }
        >
          <div id="yt-player" className="w-full h-full"></div>
        </div>

        <div className="absolute inset-0 z-10"></div>

        <div
          className={`absolute inset-0 z-30 pointer-events-none transition ${!showUI ? "opacity-0" : "opacity-100"}`}
        >
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
            <div className="w-full px-4 pb-4 pt-10 pointer-events-auto">
              <div
                ref={progressRef}
                onClick={handleSeek}
                className="h-1.5 bg-white/25 rounded-full cursor-pointer"
              >
                <div
                  className="h-1.5 bg-red-500 rounded-full"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center gap-3 mt-3 text-sm text-white">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    className="min-w-14 text-sm px-2 py-1.5 rounded hover:bg-white/10 transition"
                    onClick={togglePlay}
                  >
                    {isPlaying ? "❚❚" : "▶"}
                  </button>
                  <button
                    className="text-sm px-2 py-1.5 rounded hover:bg-white/10 transition"
                    onClick={() => seekBy(-10)}
                  >
                    -10s
                  </button>
                  <button
                    className="text-sm px-2 py-1.5 rounded hover:bg-white/10 transition"
                    onClick={() => seekBy(10)}
                  >
                    +10s
                  </button>
                  <span className="text-white/85 px-1">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(event) => changeVolume(Number(event.target.value))}
                    className="w-16 h-1 accent-white"
                  />

                  <button
                    onClick={() => setFullscreen((current) => !current)}
                    className="text-sm px-2 py-1.5 rounded hover:bg-white/10 transition"
                  >
                    {fullscreen ? "⛶ Exit" : "⛶ Full"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informasi video dan aksi interaksi */}
      <div className="space-y-4">
        <h1 className="text-xl md:text-2xl font-semibold leading-snug">
          {video.title}
        </h1>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black font-bold">
              {(video.uploadedBy || "U").charAt(0).toUpperCase()}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                {video.uploadedBy || "Unknown uploader"}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(video.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReaction("like")}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                reaction === "like"
                  ? "bg-green-500 text-black scale-105"
                  : "bg-white/10"
              }`}
            >
              👍 {video.likes || 0}
            </button>

            <button
              onClick={() => handleReaction("dislike")}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                reaction === "dislike"
                  ? "bg-red-500 text-white scale-105"
                  : "bg-white/10"
              }`}
            >
              👎 {video.dislikes || 0}
            </button>
          </div>
        </div>

        {video.description && (
          <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-line">
            {video.description}
          </div>
        )}
      </div>

      {/* Form komentar */}
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          {userData?.email?.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            className="w-full bg-white/5 p-3 rounded"
            placeholder="Tambahkan komentar..."
          />

          <div className="flex justify-end mt-2">
            <button
              onClick={addComment}
              className="bg-green-500 px-4 py-1 rounded"
            >
              Kirim
            </button>
          </div>
        </div>
      </div>

      {/* Daftar komentar */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              {comment.userEmail?.charAt(0).toUpperCase()}
            </div>

            <div className="bg-white/5 px-3 py-2 rounded-lg w-full">
              <div className="text-xs text-gray-400 flex justify-between">
                {comment.userEmail}
                {(userData?.uid === comment.userId ||
                  userData?.role === "admin") && (
                  <button
                    onClick={() => deleteComment(comment.id, comment.userId)}
                    className="text-red-400"
                  >
                    hapus
                  </button>
                )}
              </div>
              <div>{comment.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Video rekomendasi dari blok yang sama */}
      {!fullscreen && (
        <div>
          <h2 className="text-lg text-green-400">Next Video</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            {related.map((item) => (
              <Link key={item.id} href={`/watch/${item.youtubeId}`}>
                <Image
                  src={getYouTubeThumbnailUrl(item.youtubeId)}
                  alt={item.title}
                  width={480}
                  height={270}
                  className="rounded"
                />
                <p className="text-sm mt-1">{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
