/// <reference types="chrome" />

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

const chromeApi = globalThis.chrome;

if (!chromeApi) {
  throw new Error("chrome api unavailable");
}

export function ReminderApp() {
  const [fields, setFields] = useState(["", "", ""]);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasContent = useMemo(() => fields.some((value) => value.trim().length > 0), [fields]);

  const handleChange = (index: number, value: string) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasContent) {
      setStatus("add one lowercase highlight first");
      return;
    }
    setSaving(true);
    setStatus("saving…");
    const response = await chromeApi.runtime.sendMessage({
      type: "saveAccomplishment",
      items: fields.map((value) => value.trim()).filter(Boolean)
    });
    if (!response?.success) {
      setStatus(response?.error ?? "could not save yet");
      setSaving(false);
      return;
    }
    setStatus("logged ✨");
    window.setTimeout(() => window.close(), 900);
  };

  const handleSkip = () => {
    window.close();
  };

  return (
    <div className="reminder-shell font-sans text-ink">
      <form className="reminder-card" onSubmit={handleSave}>
        <h1>✨ what did you just accomplish?</h1>
        <p className="pin-subtle">
          🍅🍅🍅
        </p>
        <div className="textarea-stack">
          {fields.map((value, index) => (
            <Textarea
              key={index}
              rows={index === 0 ? 3 : 2}
              placeholder={"✍️"}
              value={value}
              onChange={(event) => handleChange(index, event.target.value)}
            />
          ))}
        </div>
        <p className="status-text">{status}</p>
        <div className="reminder-actions">
          <Button variant="ghost" type="button" onClick={handleSkip} disabled={saving}>
            maybe later
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "✍️ saving…" : "✍️ log it"}
          </Button>
        </div>
      </form>
    </div>
  );
}
