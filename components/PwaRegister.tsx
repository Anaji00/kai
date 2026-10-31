"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[KAI PWA] Service Worker active, scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("[KAI PWA] Service Worker registration error:", err);
          });
      });
    }
  }, []);

  return null;
}
