"use client";

import * as React from "react";

export type FontFamilyOption = "default" | "opendyslexic" | "lexend";
export type ColorOverlayOption = "none" | "cream" | "blue" | "green" | "pink";

export interface AccessibilitySettings {
  /** Reading font family */
  fontFamily: FontFamilyOption;
  /** Body font size in px (14–24) */
  fontSize: number;
  /** Line height multiplier (1.2–2.0) */
  lineSpacing: number;
  /** Letter spacing in em (0–0.16) */
  letterSpacing: number;
  /** Tinted reading overlay */
  colorOverlay: ColorOverlayOption;
  /** Dark color scheme */
  darkMode: boolean;
  /** High-contrast color scheme */
  highContrast: boolean;
  /** Dim everything except the hovered/focused paragraph */
  readingFocus: boolean;
  /** Show a horizontal reading ruler that follows the pointer */
  readingRuler: boolean;
  simpleMode: boolean;
}

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontFamily: "default",
  fontSize: 16,
  lineSpacing: 1.6,
  letterSpacing: 0,
  colorOverlay: "none",
  darkMode: false,
  highContrast: false,
  readingFocus: false,
  readingRuler: false,
  simpleMode: false,
};

const STORAGE_KEY = "funalearn:accessibility";

const FONT_FAMILY_MAP: Record<FontFamilyOption, string> = {
  default: "var(--font-sans)",
  opendyslexic: "'OpenDyslexic', var(--font-sans)",
  lexend: "var(--font-lexend)",
};

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  /** Update a single setting */
  setSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => void;
  /** Reset all settings to defaults */
  reset: () => void;
  /** True once settings have been read from localStorage */
  hydrated: boolean;
}

const AccessibilityContext =
  React.createContext<AccessibilityContextValue | null>(null);

function sanitize(raw: unknown): AccessibilitySettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const value = raw as Partial<AccessibilitySettings>;
  const clamp = (n: unknown, min: number, max: number, fallback: number) =>
    typeof n === "number" && !Number.isNaN(n)
      ? Math.min(max, Math.max(min, n))
      : fallback;

  return {
    fontFamily: (["default", "opendyslexic", "lexend"] as const).includes(
      value.fontFamily as FontFamilyOption,
    )
      ? (value.fontFamily as FontFamilyOption)
      : DEFAULT_SETTINGS.fontFamily,
    fontSize: clamp(value.fontSize, 14, 24, DEFAULT_SETTINGS.fontSize),
    lineSpacing: clamp(value.lineSpacing, 1.2, 2, DEFAULT_SETTINGS.lineSpacing),
    letterSpacing: clamp(
      value.letterSpacing,
      0,
      0.16,
      DEFAULT_SETTINGS.letterSpacing,
    ),
    colorOverlay: (
      ["none", "cream", "blue", "green", "pink"] as const
    ).includes(value.colorOverlay as ColorOverlayOption)
      ? (value.colorOverlay as ColorOverlayOption)
      : DEFAULT_SETTINGS.colorOverlay,
    darkMode: Boolean(value.darkMode),
    highContrast: Boolean(value.highContrast),
    readingFocus: Boolean(value.readingFocus),
    readingRuler: Boolean(value.readingRuler),
    simpleMode: Boolean(value.simpleMode),
  };
}

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] =
    React.useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted settings on mount.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(sanitize(JSON.parse(stored)));
      }
    } catch {
      // Ignore malformed storage and fall back to defaults.
    }
    setHydrated(true);
  }, []);

  // Persist whenever settings change (after hydration).
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage may be unavailable (private mode); ignore.
    }
  }, [settings, hydrated]);

  // Apply reading + theme settings to the document root so ALL text responds.
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--fl-font-family",
      FONT_FAMILY_MAP[settings.fontFamily],
    );
    root.style.setProperty("--fl-font-size", `${settings.fontSize}px`);
    root.style.setProperty("--fl-line-height", String(settings.lineSpacing));
    root.style.setProperty(
      "--fl-letter-spacing",
      `${settings.letterSpacing}em`,
    );
    root.classList.toggle("dark", settings.darkMode);
    root.classList.toggle("high-contrast", settings.highContrast);
    root.classList.toggle("reading-focus", settings.readingFocus);
    root.classList.toggle("simple-mode", settings.simpleMode);
    root.dataset.readingTint = settings.colorOverlay;
  }, [settings]);

  const setSetting = React.useCallback<AccessibilityContextValue["setSetting"]>(
    (key, value) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = React.useMemo<AccessibilityContextValue>(
    () => ({ settings, setSetting, reset, hydrated }),
    [settings, setSetting, reset, hydrated],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = React.useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider",
    );
  }
  return ctx;
}
