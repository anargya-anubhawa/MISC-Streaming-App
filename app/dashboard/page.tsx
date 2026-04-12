"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { db } from "../../lib/firebase";
import { guardUser } from "../../lib/authGuard";
import { getDateValue } from "../../lib/date";
import type {
  BlockRecord,
  DashboardViewer,
  SessionRecord,
} from "../../lib/types";

type BlockSortMode = "name" | "recent";

const DAILY_QUOTES = [
  {
    text: "Di mana pun seni kedokteran dicintai, di sana juga terdapat kecintaan terhadap kemanusiaan.",
    author: "Hippocrates",
  },
  {
    text: "Saya mengingatkan rekan-rekan saya, residen dan mahasiswa kedokteran bahwa apa yang kami lakukan adalah suatu kehormatan. Orang-orang mengizinkan kami masuk ke dalam aspek yang paling intim dalam hidup mereka, dan mereka berharap kami dapat membantu membimbing mereka melalui situasi yang sangat kompleks dan rumit.",
    author: "Shikha Jain",
  },
  {
    text: "Dalam pekerjaan kami, Anda tidak akan pernah pulang ke rumah di penghujung hari dan merasa belum melakukan sesuatu yang berharga dan penting.",
    author: "Suneel Dhand",
  },
  {
    text: "[Menjadi seorang dokter] menawarkan perpaduan yang paling lengkap dan konstan dari tiga kualitas yang memiliki daya tarik terbesar bagi pikiran yang murni dan aktif - kebaruan, kegunaan, dan amal.",
    author: "Sir James Paget (1814 - 1899)",
  },
  {
    text: "[Sebagai seorang dokter] orang akan mempercayai Anda dan menghargai upaya Anda. Anda bisa melakukan hal-hal yang luar biasa untuk orang-orang jika Anda tidak membiarkan sistem menjatuhkan Anda.",
    author: "Wes Fischer",
  },
  {
    text: "Tidak ada hal lain yang membuat manusia lebih dekat dengan para dewa selain memberikan kesehatan kepada manusia.",
    author: "Cicero (106 SM - 43 SM)",
  },
  {
    text: "Meskipun perjalanan ini terasa panjang dan sulit di awal, dengan ketekunan dan dedikasi, imbalannya akan terasa seumur hidup.",
    author: "William R. Francis",
  },
  {
    text: "Untuk memecahkan masalah yang sulit dalam dunia kedokteran, jangan mempelajarinya secara langsung, tetapi kejarlah keingintahuan Anda tentang alam dan sisanya akan mengikuti. Lakukan penelitian dasar.",
    author: "Roger Kornberg",
  },
  {
    text: "Kekaguman saat menemukan tubuh manusia. Kehormatan karena dipercaya untuk memberikan nasihat. Rasa terima kasih karena telah membantu seseorang melalui penyakit yang sulit. Hal-hal ini tidak pernah menjadi tua.",
    author: "Danielle Ofri",
  },
  {
    text: "Saya masih akan 'melakukannya lagi' meskipun ada kesulitan dalam pelatihan dan rintangan untuk sekadar berlatih kedokteran. Benar-benar sangat berharga!",
    author: "James A. Bowden",
  },
  {
    text: "Dokter adalah profesi di mana pengetahuan, kekuatan, dan hati bersatu.",
    author: "Anonim",
  },
  {
    text: "Dokter adalah orang yang memberikan kesempatan kepada orang lain untuk mendapatkan hari esok yang sehat.",
    author: "Anonim",
  },
  {
    text: "Tuhan tidak bisa datang kepada kita setiap saat, itulah sebabnya Dia mengutus para dokter untuk kita.",
    author: "Anonim",
  },
  {
    text: "Anda tidak dapat menyelamatkan dunia, tetapi Anda dapat menyelamatkan orang yang ada di depan Anda.",
    author: "Anonim",
  },
  {
    text: "Penyembuhan adalah sebuah seni. Butuh waktu, butuh latihan, butuh cinta.",
    author: "Anonim",
  },
  {
    text: "Pengobatan adalah niat. Mereka yang cukup mahir dalam menggunakan niat adalah dokter yang baik.",
    author: "Sun Simiao",
  },
  {
    text: "Para dokter selalu bekerja untuk menjaga kesehatan kita.",
    author: "Dennis Diderot",
  },
  {
    text: "Anda benar-benar dapat mengubah dunia jika Anda cukup peduli.",
    author: "Marian Wright Edelman",
  },
  {
    text: "Beberapa orang berpikir bahwa dokter dan perawat dapat meletakkan telur orak-arik kembali ke dalam cangkangnya.",
    author: "Cass Canfield",
  },
  {
    text: "Dokter yang baik mengobati penyakit, dokter yang hebat mengobati pasien yang mengidap penyakit.",
    author: "William Osler",
  },
];

function createSeededShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  let currentSeed = seed || 1;

  const random = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
  };

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function sortBlocks(blocks: BlockRecord[], sortMode: BlockSortMode) {
  return [...blocks].sort((a, b) => {
    if (sortMode === "name") {
      return a.name.localeCompare(b.name);
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

export default function Dashboard() {
  const [viewer, setViewer] = useState<DashboardViewer | null>(null);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [isTokenUnlocked, setIsTokenUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<BlockSortMode>("recent");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Dashboard menyiapkan data user dan blok aktif sekaligus.
      const user = await guardUser();
      if (!user) return;

      const [userSnap, blocksSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDocs(query(collection(db, "blocks"), where("isActive", "==", true))),
      ]);
      const localSessionId = localStorage.getItem("sessionId");

      setViewer({
        uid: user.uid,
        email: user.email || "",
        ...(userSnap.data() || {}),
      });

      if (localSessionId) {
        const sessionSnap = await getDoc(doc(db, "sessions", localSessionId));

        if (sessionSnap.exists()) {
          const sessionData = {
            id: sessionSnap.id,
            ...sessionSnap.data(),
          } as SessionRecord;

          setIsTokenUnlocked(Boolean(sessionData.isUnlocked));
        }
      }

      const data = blocksSnap.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as BlockRecord
      );

      setBlocks(sortBlocks(data, "recent"));
      setIsCheckingAuth(false);
    };

    void init();
  }, []);

  const filteredBlocks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const searched = !keyword
      ? blocks
      : blocks.filter((block) => block.name.toLowerCase().includes(keyword));

    return sortBlocks(searched, sortMode);
  }, [blocks, search, sortMode]);

  const dailyQuote = useMemo(() => {
    const today = new Date();
    const localDayNumber = Math.floor(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() /
        86400000
    );
    const cycle = Math.floor(localDayNumber / DAILY_QUOTES.length);
    const indexInCycle = localDayNumber % DAILY_QUOTES.length;
    const shuffledQuotes = createSeededShuffle(DAILY_QUOTES, cycle + 1);

    return shuffledQuotes[indexInCycle];
  }, []);

    if (isCheckingAuth) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Ringkasan area atas dashboard */}
      <section className="dashboard-shell">
        <div className="dashboard-shell-header">
          <div className="space-y-3">
            <p className="dashboard-breadcrumb">MISC / Dashboard</p>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-white">
                Selamat datang kembali{viewer?.name ? `, ${viewer.name}` : ""}.
              </h1>
              <div className="dashboard-subtitle space-y-2">
                <p className="italic">&ldquo;{dailyQuote.text}&rdquo;</p>
                <p className="dashboard-quote-author">- {dailyQuote.author}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-user-card">
            <p className="dashboard-user-label">Akun Aktif</p>
            <p className="dashboard-user-name">
              {viewer?.name || "Mahasiswa FK UMY"}
            </p>
            <p className="dashboard-user-meta">{viewer?.email || "-"}</p>
            <div className="dashboard-user-chip-row">
              <span className="dashboard-chip">
                {filteredBlocks.length} Blok Dapat Diakses
              </span>
              <span className="dashboard-chip">
                {viewer?.nim || "NIM belum diisi"}
              </span>
              <span
                className={`dashboard-chip ${
                  isTokenUnlocked
                    ? "dashboard-chip-success"
                    : "dashboard-chip-danger"
                }`}
              >
                {isTokenUnlocked ? "Subscriptions ✅" : "Subscriptions ❌"}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-search-row">
          <label className="dashboard-search">
            <span className="dashboard-search-icon">Cari</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari blok, misalnya Anatomi, Fisiologi, atau Blok 3"
              className="dashboard-search-input"
            />
          </label>

          <label className="dashboard-sort">
            <span className="dashboard-search-icon">Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as BlockSortMode)}
              className="dashboard-sort-input"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">By Name</option>
            </select>
          </label>

          <div className="dashboard-info-pill">
            <span>{blocks.length} total blok aktif</span>
          </div>
        </div>
      </section>

      {/* Daftar blok yang bisa diakses user */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredBlocks.map((block) => (
          <Link
            key={block.id}
            href={`/blok/${block.id}`}
            className="dashboard-block-card"
          >
            <div className="space-y-3">
              <div>
                <p className="dashboard-block-kicker">Blok Materi</p>
                <h2 className="dashboard-block-title">{block.name}</h2>
              </div>
              <p className="dashboard-block-body">
                {block.description?.trim() ||
                  "Buka kumpulan video materi untuk blok ini dan lanjutkan belajar dari satu halaman yang lebih rapi."}
              </p>
            </div>
            <span className="dashboard-block-link">Masuk ke blok</span>
          </Link>
        ))}
      </section>

      {!filteredBlocks.length && (
        <div className="empty-state-card">
          <p className="empty-state-title">Blok tidak ditemukan</p>
          <p className="empty-state-body">
            Coba gunakan kata kunci yang lebih singkat atau kosongkan kolom
            pencarian.
          </p>
        </div>
      )}
    </div>
  );
}
