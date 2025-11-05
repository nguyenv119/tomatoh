import { useState } from "react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { sendMessage } from "../lib/chrome";
import { useDarkMode } from "../lib/useDarkMode";

export function ReminderApp() {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useDarkMode();

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!note.trim()) {
      setStatus("add one lowercase highlight first");
      return;
    }
    setSaving(true);
    setStatus("saving…");
    const response = await sendMessage<{ success: boolean; error?: string }>({
      type: "saveAccomplishment",
      items: [note.trim()],
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
