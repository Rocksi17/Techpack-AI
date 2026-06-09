"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";

import { signOut } from "firebase/auth";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [search, setSearch] = useState("");
  const [versionModal, setVersionModal] = useState(null);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    setUserEmail(user.email);

    const q = query(
      collection(db, "techpacks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setData(results);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    window.addEventListener("focus", fetchData);
    return () => window.removeEventListener("focus", fetchData);
  }, [fetchData]);

  const openEditor = (item) => {
    localStorage.setItem(
      "techpackProject",
      JSON.stringify({
        id: item.id,
        pdf: item.editedPdfUrl || item.pdfUrl || item.pdf || "",
        texts: item.texts || [],
        images: item.images || [],
        arrows: item.arrows || [],
        lines: item.lines || [],
        measurements: item.measurements || [],
      })
    );

    router.push(`/viewer?id=${item.id}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const viewPDF = (item) => {
    const pdfLink = item.editedPdfUrl || item.pdfUrl || item.pdf;

    if (!pdfLink) {
      alert("PDF not found");
      return;
    }

    window.open(pdfLink, "_blank");
  };

  const renameProject = async (item) => {
    const newTitle = prompt("Enter new project name", item.title || item.prompt);

    if (!newTitle) return;

    await updateDoc(doc(db, "techpacks", item.id), {
      title: newTitle,
    });

    setData((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? {
              ...p,
              title: newTitle,
            }
          : p
      )
    );
  };

  const duplicateProject = async (item) => {
    const duplicated = {
      ...item,
      title: `${item.title || item.prompt} Copy`,
      status: "Draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSavedAt: null,
      lastAutoSavedAt: null,
      
    };

    delete duplicated.id;

    const newDoc = await addDoc(collection(db, "techpacks"), duplicated);

    setData((prev) => [
      {
        id: newDoc.id,
        ...duplicated,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const deleteProject = async (item) => {
    const confirmDelete = confirm(`Delete "${item.title || item.prompt}"?`);

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "techpacks", item.id));

    setData((prev) => prev.filter((p) => p.id !== item.id));
  };

  const filteredData = data.filter((item) => {
    const text = `${item.title || ""} ${item.prompt || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const formatDate = (value) => {
  if (!value) return "Not yet";

  try {
    // Firestore Timestamp
    if (value?.toDate) {
      return value.toDate().toLocaleString();
    }

    // Firestore seconds object
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleString();
    }

    // ISO string
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return "Not yet";
    }

    return date.toLocaleString();
  } catch {
    return "Not yet";
  }
};

  const restoreVersion = async (project, version) => {
    const confirmRestore = confirm(
      "Restore this version? Current editor data will be replaced."
    );

    if (!confirmRestore) return;

    const restoreData = {
      texts: version.texts || [],
      images: version.images || [],
      arrows: version.arrows || [],
      lines: version.lines || [],
      measurements: version.measurements || [],
      status: "Edited",
      updatedAt: serverTimestamp(),
    };

    if (version.pdf) {
      restoreData.pdf = version.pdf;
    }

    if (version.pdfUrl) {
      restoreData.pdfUrl = version.pdfUrl;
      restoreData.editedPdfUrl = version.pdfUrl;
    }

    await updateDoc(doc(db, "techpacks", project.id), restoreData);

    setData((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              ...restoreData,
            }
          : p
      )
    );

    setVersionModal(null);

    alert("Version restored");
  };

  const btnBlue =
    "bg-[#06152F] border border-[#2563EB]/70 text-blue-200 px-3 py-1.5 rounded-lg text-xs shadow-[0_0_12px_rgba(37,99,235,0.35)] hover:bg-[#123B8A] hover:text-white hover:border-blue-400 hover:shadow-[0_0_22px_rgba(37,99,235,0.75)] transition-all";

 return (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e1b4b_0%,#020617_55%)] text-white p-8">
    <div className="max-w-6xl mx-auto">
      {/* TOP */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold">Dashboard</h1>
          <p className="text-slate-400 mt-1">{userEmail}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push("/")} className={btnBlue}>
            New
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects..."
        className="
          w-full h-16 mb-8 px-6
          rounded-2xl
          bg-[#081428]/90
          border border-blue-500/40
          text-white
          placeholder:text-slate-500
          outline-none
          shadow-[0_0_30px_rgba(37,99,235,0.18)]
          focus:border-violet-400
        "
      />

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredData.map((item) => {
          const previewPdf =
            item.editedPdfUrl || item.pdfUrl || item.pdf || "";

          return (
            <div
              key={item.id}
              className="
                rounded-3xl
                bg-[#07101f]/95
                border border-blue-500/40
                shadow-[0_0_35px_rgba(37,99,235,0.18)]
                p-6
              "
            >
              {previewPdf ? (
                <iframe
                  src={previewPdf}
                  title="PDF Preview"
                  className="w-full h-56 rounded-xl mb-5 border border-white/20 bg-white"
                />
              ) : (
                <div className="w-full h-56 rounded-xl mb-5 border border-white/20 bg-white/10 flex items-center justify-center text-slate-400">
                  No preview
                </div>
              )}

              <h2 className="text-2xl font-bold">
                {item.title || item.prompt}
              </h2>

              <p className="text-slate-400 mt-3 text-sm">
                {item.createdAt?.seconds
                  ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                  : "No date"}
              </p>

              <span
  className={`
    inline-flex items-center mt-5 px-4 py-2 rounded-full
    text-sm font-bold border backdrop-blur-xl

    ${
      item.status === "Exported"
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/50 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
        : item.status === "Edited"
        ? "bg-violet-500/15 text-violet-300 border-violet-400/50 shadow-[0_0_18px_rgba(139,92,246,0.35)]"
        : "bg-blue-500/15 text-blue-300 border-blue-400/50 shadow-[0_0_18px_rgba(37,99,235,0.35)]"
    }
  `}
>
  {item.status || "Draft"}
</span>

              <div className="mt-8 border-t border-slate-600 pt-5 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Last Saved</span>
                  <span className="text-blue-200">
                    {formatDate(
                      item.lastSavedAt ||
                        item.lastSavedAtText ||
                        item.lastAutoSavedAt ||
                        item.lastAutoSavedAtText
                    )}
                  </span>
                </div>

                <div className="flex justify-between mt-3">
                  <span>Versions</span>
                  <span className="text-violet-400 font-bold">
                    {item.versions?.length || 0}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3 flex-wrap">
                <button onClick={() => openEditor(item)} className={btnBlue}>
                  Open
                </button>

                {previewPdf && (
                  <button onClick={() => viewPDF(item)} className={btnBlue}>
                    View
                  </button>
                )}

                <button onClick={() => renameProject(item)} className={btnBlue}>
                  Rename
                </button>

                <button onClick={() => duplicateProject(item)} className={btnBlue}>
                  Dupli
                </button>

                {previewPdf && (
                  <a href={previewPdf} download className={btnBlue}>
                    Down
                  </a>
                )}

                <button onClick={() => setVersionModal(item)} className={btnBlue}>
                  Ver
                </button>

                <button
                  onClick={() => deleteProject(item)}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600"
                >
                  Del
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
}