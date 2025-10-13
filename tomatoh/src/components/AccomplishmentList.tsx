import { motion } from "framer-motion";
import { Clock, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export interface AccomplishmentEntry {
  timestamp: string;
  note: string;
}

interface AccomplishmentListProps {
  entries: AccomplishmentEntry[];
  draft: string;
  onDraftChange: (_highlight: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  status: string | null;
  celebration: boolean;
}

export function AccomplishmentList({
  entries,
  draft,
  onDraftChange,
  onSave,
  saving,
  status,
  celebration
}: AccomplishmentListProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="stagger-offset"
    >
      <Card>
        <CardHeader>
          <CardTitle>today’s wins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="entries-stack">
            {entries.length === 0 ? (
              <p className="pin-empty">no pins yet — drop your latest win below.</p>
            ) : (
              entries.map((entry) => (
                <motion.article
                  key={entry.timestamp}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="entry-card"
                >
                  <span className="entry-time">
                    <Clock className="h-4 w-4" aria-hidden />
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </span>
                  <p className="entry-note">{entry.note}</p>
                </motion.article>
              ))
            )}
          </div>
          <div className="input-group">
            <Textarea
              id="highlight"
              placeholder="write one lingering win…"
              value={draft}
              rows={3}
              onChange={(event) => onDraftChange(event.target.value)}
            />
            <div className="cta-row">
              <span className="status-text">{status}</span>
              <Button onClick={onSave} disabled={saving} className="btn-sm">
                <Plus className="h-4 w-4" aria-hidden />
                {saving ? "saving…" : "save win"}
              </Button>
            </div>
          </div>
        </CardContent>
        {celebration ? <motion.div className="confetti-burst">🌿 ✨ 🍅</motion.div> : null}
      </Card>
    </motion.div>
  );
}
