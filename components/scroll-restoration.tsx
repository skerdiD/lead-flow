"use client";

import { useEffect } from "react";

export function ScrollRestoration() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const scrollToTop = () => window.scrollTo(0, 0);
    window.addEventListener("beforeunload", scrollToTop);
    window.addEventListener("pageshow", scrollToTop);

    return () => {
      window.removeEventListener("beforeunload", scrollToTop);
      window.removeEventListener("pageshow", scrollToTop);
    };
  }, []);

  return null;
}
