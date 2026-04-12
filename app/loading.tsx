"use client";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black animate-fadeIn">
      {/* Loader umum untuk transisi halaman */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-green-400 text-sm tracking-widest animate-pulse">
          LOADING...
        </p>
      </div>
    </div>
  );
}
