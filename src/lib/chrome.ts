/// <reference types="chrome" />

import { type AccomplishmentEntry } from "../components/AccomplishmentList";

export const chromeApi = globalThis.chrome;
export const ALARM_NAME = "accomplishment-reminder";

export type EntriesByDay = Record<string, AccomplishmentEntry[]>;

export const storageGet = <T,>(keys?: string[]): Promise<T> =>
  new Promise((resolve) => {
    if (!chromeApi?.storage?.local) {
      resolve({} as T);
      return;
    }
    chromeApi.storage.local.get(keys ?? null, (result) => resolve(result as T));
  });

export const sendMessage = <T,>(message: unknown): Promise<T> =>
  new Promise((resolve) => {
    if (!chromeApi?.runtime?.sendMessage) {
      resolve({ success: false } as T);
      return;
    }
    chromeApi.runtime.sendMessage(message, (response: T) => resolve(response));
  });

type ChromeAlarm = { scheduledTime?: number };

export const getAlarm = (name: string): Promise<ChromeAlarm | undefined> =>
  new Promise((resolve) => {
    if (!chromeApi?.alarms?.get) {
      resolve(undefined);
      return;
    }
    chromeApi.alarms.get(name, (alarm) => resolve(alarm ?? undefined));
  });

export function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

