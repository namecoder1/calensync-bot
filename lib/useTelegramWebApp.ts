"use client";

import { useEffect, useMemo, useState } from "react";

// Minimal types to avoid extra dependencies
// See: https://core.telegram.org/bots/webapps
interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebApp {
  initData: string; // raw query string
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    receiver?: TelegramUser;
    chat?: unknown;
    chat_type?: string;
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date?: number;
    hash?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  platform: string;
  isClosingConfirmationEnabled: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  MainButton: {
    text: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style?: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    selectionChanged: () => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
}

function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as any).Telegram?.WebApp as TelegramWebApp | undefined;
  return tg ?? null;
}

export function useTelegramWebApp() {
  // Initialize as null to ensure the first client render matches the server output.
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [devUser, setDevUser] = useState<TelegramUser | null>(null);
  const [sdkTimeoutExceeded, setSdkTimeoutExceeded] = useState(false);

  // Check dev mode
  useEffect(() => {
    fetch('/api/dev-mode-check')
      .then(res => res.json())
      .then(data => {
        if (data.devMode) {
          setDevMode(true);
          setDevUser({
            id: parseInt(data.devUser.id),
            first_name: data.devUser.first_name,
            last_name: data.devUser.last_name,
            is_bot: false,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 80; // ~4s @ 50ms

    const initWith = (tg: TelegramWebApp) => {
      if (cancelled) return;
      try { tg.ready(); } catch {}
      try { tg.expand(); } catch {}
      setWebApp(tg);
      setColorScheme(tg.colorScheme ?? "light");

      const handleThemeChange = () => setColorScheme(tg.colorScheme);
      tg.onEvent("themeChanged", handleThemeChange);

      return () => {
        try { tg.offEvent("themeChanged", handleThemeChange); } catch {}
      };
    };

    const poll = () => {
      const tg = getWebApp();
      if (tg) {
        cleanup = initWith(tg) || undefined;
        return;
      }
      if (cancelled) return;
      if (attempts++ > maxAttempts) {
        setSdkTimeoutExceeded(true);
        return;
      }
      timer = setTimeout(poll, 50);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup: (() => void) | undefined;
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, []);

  // Ensure SSR and the first client render stay identical; flip true only after mount.
  const isTelegram = mounted && (!!webApp || devMode);

  const user = useMemo(() => {
    if (devMode && devUser) return devUser;
    return webApp?.initDataUnsafe?.user;
  }, [webApp, devMode, devUser]);

  return {
    webApp,
    isTelegram,
    user,
    colorScheme,
    themeParams: webApp?.themeParams,
    devMode, // Esponi anche devMode per debugging
    sdkTimeoutExceeded,
  } as const;
}
