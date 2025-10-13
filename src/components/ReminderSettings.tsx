import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ReminderSettingsProps {
  interval: number;
  onIntervalChange: (_minutes: number) => void;
  onSave: () => Promise<void>;
  onOpenReminder: () => void;
  status: string | null;
  saving: boolean;
  nextReminder: string;
}

export function ReminderSettings({
  interval,
  onIntervalChange,
  onSave,
  onOpenReminder,
  status,
  saving,
  nextReminder
}: ReminderSettingsProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="stagger-offset"
    >
      <Card>
        <CardHeader>
          <CardTitle>⏲️ reminders</CardTitle>
          <CardDescription>
            choose how often the bell nudges you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="input-group">
            <label htmlFor="interval" className="pin-label">
              minutes between nudges
            </label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={1440}
              value={Number.isFinite(interval) ? interval : ""}
              onChange={(event) => onIntervalChange(Number(event.target.value))}
            />
            <div className="cta-row">
              <span className="status-text">{status}</span>
              <Button onClick={onSave} disabled={saving} className="btn-sm">
                {saving ? "🧭 saving…" : "🧭 save interval"}
              </Button>
            </div>
          </div>
          <div className="soft-banner">
            <div className="flex items-center justify-between gap-3">
              <span className="pin-timestamp">{nextReminder}</span>
              <Button variant="ghost" onClick={onOpenReminder} className="btn-sm">
                <Play className="h-4 w-4" aria-hidden />
                open reminder now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
