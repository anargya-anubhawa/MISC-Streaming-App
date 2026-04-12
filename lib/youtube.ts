const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function normalizeYouTubeId(input: string | null | undefined) {
  const value = input?.trim();

  if (!value) return "";

  if (YOUTUBE_ID_REGEX.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const shortId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_ID_REGEX.test(shortId) ? shortId : "";
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const watchId = url.searchParams.get("v") ?? "";
      if (YOUTUBE_ID_REGEX.test(watchId)) {
        return watchId;
      }

      const pathId = url.pathname.split("/").filter(Boolean).pop() ?? "";
      return YOUTUBE_ID_REGEX.test(pathId) ? pathId : "";
    }
  } catch {
    return "";
  }

  return "";
}

export function getYouTubeThumbnailUrl(input: string | null | undefined) {
  const youtubeId = normalizeYouTubeId(input);

  if (!youtubeId) return "";

  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}
