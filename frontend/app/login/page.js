"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      alert("Logged in");

      // 🔥 GO TO HOME PAGE
      router.push("/");

    } catch (err) {
      alert(err.message);
    }
  };

  const signup = async () => {
    try {

      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      alert("Account created");

      // 🔥 GO TO HOME PAGE
      router.push("/");

    } catch (err) {
      alert(err.message);
    }
  };

  return (
  <main className="min-h-screen w-full bg-[radial-gradient(circle_at_30%_20%,#1e1b4b_0%,#050816_42%,#020617_100%)] flex items-center justify-center overflow-hidden">

    {/* Glow Background */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_50%,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_35%_45%,rgba(139,92,246,0.28),transparent_35%)]" />

    <section
      className="
        relative
        w-[460px]
        rounded-[32px]
        bg-[#07101f]/85
        backdrop-blur-2xl
        border
        border-blue-500/60
        shadow-[0_0_45px_rgba(37,99,235,0.45),0_0_70px_rgba(139,92,246,0.25)]
        p-10
      "
    >
      <h1
        className="
          text-center
          text-5xl
          font-extrabold
          bg-gradient-to-r
          from-violet-400
          to-blue-500
          bg-clip-text
          text-transparent
          drop-shadow-[0_0_18px_rgba(99,102,241,0.55)]
          mb-8
        "
      >
        Techpack AI
      </h1>

      <p className="text-center text-slate-300 mb-8">
        Login to continue
      </p>

      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="
          w-full
          h-14
          mb-5
          px-5
          rounded-xl
          border
          border-blue-500/60
          bg-[#020617]/60
          text-white
          placeholder:text-slate-500
          outline-none
          focus:border-violet-400
          focus:shadow-[0_0_20px_rgba(139,92,246,0.4)]
        "
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="
          w-full
          h-14
          mb-6
          px-5
          rounded-xl
          border
          border-blue-500/60
          bg-[#020617]/60
          text-white
          placeholder:text-slate-500
          outline-none
          focus:border-violet-400
          focus:shadow-[0_0_20px_rgba(139,92,246,0.4)]
        "
      />

      <button
        onClick={login}
        className="
          w-full
          h-14
          rounded-xl
          bg-gradient-to-r
          from-violet-600
          to-blue-600
          text-white
          text-lg
          font-bold
          shadow-[0_0_30px_rgba(37,99,235,0.55)]
          hover:scale-[1.02]
          transition-all
        "
      >
        Login
      </button>

      <button
        onClick={signup}
        className="
          mt-4
          w-full
          h-14
          rounded-xl
          border
          border-blue-500/60
          bg-[#020617]/50
          text-blue-300
          font-semibold
          hover:bg-blue-600/10
          hover:border-violet-400
          transition-all
        "
      >
        Create Account
      </button>
    </section>
  </main>
);
}