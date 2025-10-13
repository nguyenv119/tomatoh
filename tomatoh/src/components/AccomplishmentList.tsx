import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="stagger-offset"
    >
      <Card>
        <CardContent>
          <div className="input-group">
            <Textarea
              id="highlight"
              placeholder="write something…✍️✍️✍️"
              value={draft}
              rows={3}
              ref={textareaRef}
              onChange={(event) => onDraftChange(event.target.value)}
            />
            <div className="cta-row">
              <span className="status-text">{status}</span>
              <Button onClick={onSave} disabled={saving} className="btn-sm">
                {saving ? "📝 logging…" : "📝 log event"}
              </Button>
            </div>
          </div>
          <div className="entries-stack">
            {entries.length === 0 ? (
              <p className="pin-empty">no pins yet</p>
            ) : (
              entries.map((entry) => (
                <motion.article
                  key={entry.timestamp}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="entry-card"
                >
                  <span className="entry-time">
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
        </CardContent>
        {celebration ? <motion.div className="confetti-burst">✨✨✨✨✨</motion.div> : null}
      </Card>
    </motion.div>
  );
}
