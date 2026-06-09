"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function EditorPage() {

  const params = useParams();

  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {

    const loadTechpack = async () => {

      const ref = doc(db, "techpacks", params.id);

      const snap = await getDoc(ref);

      if (snap.exists()) {
        setPdfUrl(snap.data().pdfUrl);
      }

    };

    loadTechpack();

  }, [params.id]);

  return (
    <div className="w-full h-screen bg-gray-100">

      {/* TOP BAR */}
      <div className="h-16 bg-white border-b flex items-center px-6">
        <h1 className="text-xl font-bold">
          Techpack Editor
        </h1>
      </div>

      {/* PDF VIEWER */}
      <div className="w-full h-[calc(100vh-64px)]">

        {pdfUrl ? (

          <iframe
            src={pdfUrl}
            className="w-full h-full"
          />

        ) : (

          <div className="flex items-center justify-center h-full">
            Loading PDF...
          </div>

        )}

      </div>
    </div>
  );
}