/// <reference types="chrome" />

import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

const chromeApi = globalThis.chrome;

const storageGet = <T,>(keys?: string[]): Promise<T> =>
  new Promise((resolve) => {
    if (!chromeApi?.storage?.local) {
      resolve({} as T);
      return;
    }
    chromeApi.storage.local.get(keys ?? null, (result) => resolve(result as T));
  });

export function ReminderApp() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDarkMode = async () => {
      if (chromeApi?.storage?.local) {
        const result = await storageGet<{ darkMode?: boolean }>(["darkMode"]);
        if (result.darkMode !== undefined) {
          document.documentElement.classList.toggle("dark", result.darkMode);
        }
      } else {
        const saved = localStorage.getItem("darkMode");
        if (saved !== null) {
          const isDark = saved === "true";
          document.documentElement.classList.toggle("dark", isDark);
        }
      }
    };
    loadDarkMode();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!note.trim()) {
      setStatus("add one lowercase highlight first");
      return;
    }
    setSaving(true);
    setStatus("saving…");
    if (!chromeApi?.runtime?.sendMessage) {
      setStatus("chrome api unavailable");
      setSaving(false);
      return;
    }
    const response = await chromeApi.runtime.sendMessage({
      type: "saveAccomplishment",
      items: [note.trim()]
    });
    if (!response?.success) {
      setStatus(response?.error ?? "could not save yet");
      setSaving(false);
      return;
    }
    setStatus("logged ✨");
    setNote("");
    setSaving(false);
  };

  const handleSkip = () => {
    window.close();
  };

  return (
    <div className="reminder-shell font-sans text-ink">
      <form className="reminder-card" onSubmit={handleSave}>
        <h1>✨ what did you just accomplish?</h1>
        <div className="textarea-stack">
          <Textarea
            rows={3}
            placeholder="write something…✍️✍️✍️"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <p className="status-text">{status}</p>
        <div className="reminder-actions">
          <Button variant="ghost" type="button" onClick={handleSkip} disabled={saving}>
            maybe later
          </Button>
          <Button type="submit" disabled={saving} className="btn-sm">
            {saving ? "📝 logging…" : "log it 📝"}
          </Button>
        </div>
      </form>
    </div>
  );
}
