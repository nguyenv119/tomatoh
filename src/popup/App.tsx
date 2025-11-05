import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { ReminderSettings } from "../components/ReminderSettings";
import { ExportButtons } from "../components/ExportButtons";
import {
  chromeApi,
  storageGet,
  sendMessage,
  getAlarm,
  todayKey,
  ALARM_NAME,
  type EntriesByDay,
  triggerDownload,
} from "../lib/chrome";
import { useDarkMode } from "../lib/useDarkMode";
import {
  AccomplishmentList,
  type AccomplishmentEntry,
} from "../components/AccomplishmentList";

const navItems = [
  { id: 0, icon: "📝", label: "log" },
  { id: 1, icon: "⏱", label: "reminders" },
  { id: 2, icon: "📤", label: "exports" },
];

export function App() {
  const [entries, setEntries] = useState<AccomplishmentEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(15);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [intervalStatus, setIntervalStatus] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [nextReminder, setNextReminder] = useState(
    "loading reminder schedule…"
  );
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingInterval, setSavingInterval] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const [step, setStep] = useState(0);
  const { isDarkMode, toggleDarkMode } = useDarkMode({ listenToStorage: true });

  const loadEntries = async () => {
    const key = todayKey();
    const { entries: storedEntries = {} as EntriesByDay } = await storageGet<{
      entries?: EntriesByDay;
    }>(["entries"]);
    const todays = Array.isArray(storedEntries[key!])
      ? storedEntries[key!]
      : [];
    const ordered = [...todays!].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setEntries(ordered);
  };

  const loadInterval = async () => {
    const response = await sendMessage<{ success: boolean; minutes: number }>({
      type: "getInterval",
    });
    if (response?.success) {
      setIntervalMinutes(response.minutes);
    }
  };

  const refreshNextReminder = async () => {
    const scheduledTime = (
      (await getAlarm(ALARM_NAME)) as { scheduledTime?: number } | undefined
    )?.scheduledTime;
    if (!scheduledTime) {
      setNextReminder("reminder will schedule soon");
      return;
    }
    const diff = scheduledTime - Date.now();
    if (diff <= 0) {
      setNextReminder("next nudge is arriving");
      return;
    }
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.round((diff % 60000) / 1000);
    const readable = new Date(scheduledTime).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    setNextReminder(`next in ${minutes}m ${seconds}s · about ${readable}`);
  };

  useEffect(() => {
    loadEntries();
    loadInterval();
    refreshNextReminder();
    const poll = window.setInterval(refreshNextReminder, 10000);

    type StorageListener = (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      areaName: string
    ) => void;
    type StorageChanges = Record<
      string,
      { newValue?: unknown; oldValue?: unknown }
    >;

    const handleStorageChange: StorageListener = (changes, areaName) => {
      if (areaName !== "local") return;
      const typedChanges = changes as StorageChanges;
      if (typedChanges.entries) loadEntries();
      if (typedChanges.reminderIntervalMinutes) {
        loadInterval();
        refreshNextReminder();
      }
    };

    if (chromeApi?.storage?.onChanged) {
      chromeApi.storage.onChanged.addListener(handleStorageChange);
    }

    return () => {
      window.clearInterval(poll);
      if (chromeApi?.storage?.onChanged) {
        chromeApi.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const handleSaveEntry = async () => {
    const note = draft.trim();
    if (!note) {
      setSaveStatus("write smth!");
      return;
    }
    setSavingEntry(true);
    setSaveStatus("saving…");
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: "saveAccomplishment",
      items: [note],
    });
    if (!response?.success) {
      setSaveStatus(response?.error ?? "could not save yet");
    } else {
      setSaveStatus("saved ✨");
      setDraft("");
      setCelebration(true);
      window.setTimeout(() => setCelebration(false), 1200);
      await loadEntries();
    }
    setSavingEntry(false);
  };

  const handleSaveInterval = async () => {
    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
      setIntervalStatus("interval must be at least one minute");
      return;
    }
    setSavingInterval(true);
    setIntervalStatus("saving…");
    const response = await sendMessage<{ success: boolean; minutes: number }>({
      type: "updateInterval",
      minutes: intervalMinutes,
    });
    if (!response?.success) {
      setIntervalStatus("could not update interval");
    } else {
      setIntervalStatus("interval updated");
      await refreshNextReminder();
    }
    setSavingInterval(false);
  };

  const handleExportJson = async () => {
    setExportBusy(true);
    const data = await storageGet<{ entries?: EntriesByDay }>(["entries"]);
    triggerDownload(
      `accomplishments-${todayKey()}.json`,
      JSON.stringify(data.entries ?? {}, null, 2),
      "application/json"
    );
    setExportBusy(false);
  };

  const handleExportCsv = async () => {
    setExportBusy(true);
    const { entries: storedEntries = {} as EntriesByDay } = await storageGet<{
      entries?: EntriesByDay;
    }>(["entries"]);
    const rows = [["date", "time", "note"]];
    Object.entries(storedEntries).forEach(([date, daily]) => {
      daily.forEach((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        rows.push([date, time, entry.note.replace(/"/g, '""')]);
      });
    });
    const csv = rows
      .map((cols) => cols.map((col) => `"${col}"`).join(","))
      .join("\r\n");
    triggerDownload(`accomplishments-${todayKey()}.csv`, csv, "text/csv");
    setExportBusy(false);
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "reset every saved accomplishment? this cannot be undone."
    );
    if (!confirmed) return;
    setExportBusy(true);
    await sendMessage({ type: "resetEntries" });
    await loadEntries();
    setExportBusy(false);
  };

  const handleOpenReminder = async () => {
    await sendMessage({ type: "openReminder" });
  };

  const todaysEntries = useMemo(() => entries, [entries]);

  const panes = [
    <AccomplishmentList
      key="logs"
      entries={todaysEntries}
      draft={draft}
      onDraftChange={setDraft}
      onSave={handleSaveEntry}
      saving={savingEntry}
      status={saveStatus}
      celebration={celebration}
    />,
    <ReminderSettings
      key="reminders"
      interval={intervalMinutes}
      onIntervalChange={setIntervalMinutes}
      onSave={handleSaveInterval}
      onOpenReminder={handleOpenReminder}
      status={intervalStatus}
      saving={savingInterval}
      nextReminder={nextReminder}
    />,
    <ExportButtons
      key="exports"
      onExportJson={handleExportJson}
      onExportCsv={handleExportCsv}
      onReset={handleReset}
      busy={exportBusy}
    />,
  ];

  return (
    <div className="layout font-sans text-ink">
      <header className="header-block">
        <h1 className="header-title">🍅 tomatoh</h1>
        <p>notice and account your tasks</p>
        <button
          type="button"
          className="light-dark-toggle"
          onClick={toggleDarkMode}
          aria-label={
            isDarkMode ? "switch to light mode" : "switch to dark mode"
          }
        >
          {isDarkMode ? (
            <Moon className="h-5 w-5" aria-hidden />
          ) : (
            <Sun className="h-5 w-5" aria-hidden />
          )}
        </button>
      </header>
      <div className="pin-grid">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28 }}
          >
            {panes[step]}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="pagination-bar">
        <div className="nav-items">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`${step === index ? "nav-item nav-item-active" : "nav-item"}`}
              onClick={() => setStep(index)}
              aria-label={item.label}
            >
              <span className="nav-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
