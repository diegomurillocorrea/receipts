"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PixelBlast = dynamic(() => import("@/components/pixel-blast"), {
  ssr: false,
});

/** Light: DAIEGO red · Dark: DAIEGO emerald */
const PIXEL_COLOR = {
  light: "#dc2626",
  dark: "#34d399",
};

function useDocumentTheme() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setTheme(root.classList.contains("dark") ? "dark" : "light");
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function HomePixelBlastBackground() {
  const theme = useDocumentTheme();
  const color = PIXEL_COLOR[theme] ?? PIXEL_COLOR.light;

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <PixelBlast
        variant="circle"
        pixelSize={3}
        color={color}
        patternScale={2.5}
        patternDensity={2.1}
        pixelSizeJitter={0.35}
        enableRipples
        rippleSpeed={0.4}
        rippleThickness={0.12}
        rippleIntensityScale={1.5}
        speed={0.5}
        edgeFade={0.12}
        transparent
      />
    </div>
  );
}
