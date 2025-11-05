import { useEffect, useState } from "react";
import { chromeApi, storageGet } from "./chrome";

interface UseDarkModeOptions {
  listenToStorage?: boolean;
}

export function useDarkMode(options?: UseDarkModeOptions) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadDarkMode = async () => {
      if (chromeApi?.storage?.local) {
        const result = await storageGet<{ darkMode?: boolean }>(["darkMode"]);
        if (result.darkMode !== undefined) {
          setIsDarkMode(result.darkMode);
          document.documentElement.classList.toggle("dark", result.darkMode);
        }
      } else {
        const saved = localStorage.getItem("darkMode");
        if (saved !== null) {
          const isDark = saved === "true";
          setIsDarkMode(isDark);
          document.documentElement.classList.toggle("dark", isDark);
        }
      }
    };

    loadDarkMode();

    if (options?.listenToStorage && chromeApi?.storage?.onChanged) {
      const handleStorageChange = (
        changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
        areaName: string
      ) => {
        if (areaName !== "local") return;
        if (changes.darkMode) {
          const newMode = (changes.darkMode.newValue as boolean) ?? false;
          setIsDarkMode(newMode);
          document.documentElement.classList.toggle("dark", newMode);
        }
      };

      chromeApi.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chromeApi.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [options?.listenToStorage]);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);

    if (chromeApi?.storage?.local) {
      await new Promise<void>((resolve) => {
        chromeApi.storage.local.set({ darkMode: newMode }, () => resolve());
      });
    } else {
      localStorage.setItem("darkMode", String(newMode));
    }
  };

  return { isDarkMode, toggleDarkMode };
}

