"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import {

  collection,

  addDoc,

  serverTimestamp,

} from "firebase/firestore";

export default function Home() {

  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);

  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, (currentUser) => {

      if (!currentUser) {

        router.push("/login");

        return;

      }

      setUser(currentUser);

    });

    return () => unsub();

  }, [router]);

  const blobToBase64 = (blob) => {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onloadend = () => {

        resolve(reader.result);

      };

      reader.onerror = reject;

      reader.readAsDataURL(blob);

    });

  };

  const generateTechpack = async () => {

    try {

      if (!user) {

        alert("Please login first");

        return;

      }

      if (!prompt.trim()) {

        alert("Enter a prompt");

        return;

      }

      setLoading(true);

      console.log("🔥 Sending request");

      const res = await fetch("http://127.0.0.1:5000/generate", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({ prompt }),

      });

      console.log("✅ Backend response");

      if (!res.ok) {

        throw new Error("Backend failed");

      }

      const blob = await res.blob();

      console.log("✅ Blob created");

      const pdfBase64 = await blobToBase64(blob);

      console.log("✅ PDF converted to base64");

      const docRef = await addDoc(collection(db, "techpacks"), {

        userId: user.uid,

        userEmail: user.email,

        prompt,

        title: prompt,

        pdfUrl: pdfBase64,

        createdAt: serverTimestamp(),

      });

      console.log("✅ Saved to Firestore:", docRef.id);

      localStorage.removeItem("techpackProject");

      localStorage.removeItem("tempPdf");

      localStorage.removeItem("editingProjectId");

      localStorage.setItem("tempPdf", pdfBase64);

      router.push(`/viewer?id=${docRef.id}`);

    } catch (err) {

      console.error("❌ ERROR:", err);

      alert(err.message);

    } finally {

      setLoading(false);

    }

  };

  return (
  <main className="min-h-screen w-full bg-[radial-gradient(circle_at_30%_20%,#1e1b4b_0%,#050816_42%,#020617_100%)] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_50%,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_35%_45%,rgba(139,92,246,0.28),transparent_35%)]" />

    <div
  className="
    absolute
    w-[500px]
    h-[500px]
    rounded-full
    bg-violet-600/10
    blur-[120px]

    top-[-100px]
    left-[-100px]
  "
/>

<div
  className="
    absolute
    w-[500px]
    h-[500px]
    rounded-full
    bg-blue-600/10
    blur-[120px]

    bottom-[-100px]
    right-[-100px]
  "
/>

    <section
      className="
        relative
        w-[520px]
        rounded-[30px]
        bg-[#07101f]/80
        backdrop-blur-2xl
        border
        border-blue-500/70
        shadow-[0_0_60px_rgba(37,99,235,0.35),0_0_120px_rgba(139,92,246,0.2)]
        px-10
        py-10
      "
    >
      <h1
        className="
          text-center
          text-4xl
          font-extrabold
          bg-gradient-to-r
          from-violet-400
          to-blue-500
          bg-clip-text
          text-transparent
          drop-shadow-[0_0_18px_rgba(99,102,241,0.55)]
        "
      >
        Techpack AI
      </h1>

      <p className="mt-5 text-center text-slate-300 text-base">
        Generate professional fashion tech packs instantly
      </p>

      <div
        className="
          mt-8
          h-16

          rounded-xl

          border
          border-blue-500/60

          bg-[#0b1220]

          shadow-[0_0_20px_rgba(37,99,235,0.2)]

          flex
          items-center
          px-4
          gap-3
        "
      >
        <div
  className="
    w-10 h-10
    rounded-xl
    bg-gradient-to-br
    from-violet-500
    to-blue-600

    flex
    items-center
    justify-center

    text-white
    font-bold

    shadow-[0_0_25px_rgba(59,130,246,0.6)]
  "
>
  T
</div>

        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. oversized jacket with zipper"
          className="
            flex-1
            bg-transparent
            outline-none
            text-slate-100
            placeholder:text-slate-500
            text-lg
          "
        />
      </div>

      <button
  onClick={generateTechpack}
  disabled={loading}
  className="
    mt-6
    w-full
    h-16
    rounded-2xl

    bg-gradient-to-r
    from-violet-600
    to-blue-600

    text-white
    text-xl
    font-extrabold

    shadow-[0_0_35px_rgba(59,130,246,0.6)]

    hover:scale-[1.03]
    hover:shadow-[0_0_45px_rgba(59,130,246,0.8)]

    active:scale-[0.98]

    transition-all
    duration-300

    disabled:opacity-50

    flex
    items-center
    justify-center
  "
>
  {loading ? "Generating..." : "✧ Generate Techpack"}
</button>

      <button
        onClick={() => router.push('/dashboard')}
        className="
          mt-6
          w-full
          h-16
          rounded-xl
          border
          border-blue-500/80
          bg-[#0b1220]
          shadow-[0_0_20px_rgba(37,99,235,0.15)]
          text-blue-300
          text-xl
          font-bold
          hover:bg-blue-600/15
          transition
          flex
          items-center
          justify-center
          gap-3
        "
      >
        ⊞ Go to Dashboard
      </button>
    </section>
  </main>
);

}