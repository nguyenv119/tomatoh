import { useEffect, useState } from "react";
import { chromeApi, storageGet } from "./chrome";

interface UseSnoozeOptions {
  listenToStorage?: boolean;
}

export function useSnooze(options?: UseSnoozeOptions) {
  const [isSnoozed, setIsSnoozed] = useState(false);

  useEffect(() => {
    const loadSnooze = async () => {
      if (chromeApi?.storage?.local) {
        const result = await storageGet<{ isSnoozed?: boolean }>(["isSnoozed"]);
        if (result.isSnoozed !== undefined) {
          setIsSnoozed(result.isSnoozed);
        }
      } else {
        const saved = localStorage.getItem("isSnoozed");
        if (saved !== null) {
          const isSnoozedValue = saved === "true";
          setIsSnoozed(isSnoozedValue);
        }
      }
    };

    loadSnooze();

    if (options?.listenToStorage && chromeApi?.storage?.onChanged) {
      const handleStorageChange = (
        changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
        areaName: string
      ) => {
        if (areaName !== "local") return;
        if (changes.isSnoozed) {
          const newValue = (changes.isSnoozed.newValue as boolean) ?? false;
          setIsSnoozed(newValue);
        }
      };

      chromeApi.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chromeApi.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [options?.listenToStorage]);

  const toggleSnooze = async () => {
    const newValue = !isSnoozed;
    setIsSnoozed(newValue);

    if (chromeApi?.storage?.local) {
      await new Promise<void>((resolve) => {
        chromeApi.storage.local.set({ isSnoozed: newValue }, () => resolve());
      });
    } else {
      localStorage.setItem("isSnoozed", String(newValue));
    }
  };

  return { isSnoozed, toggleSnooze };
}

