import { motion } from "framer-motion";
import { RefreshCcw, FileJson } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface ExportButtonsProps {
  onExportJson: () => Promise<void>;
  onExportCsv: () => Promise<void>;
  onReset: () => Promise<void>;
  busy: boolean;
}

export function ExportButtons({ onExportJson, onExportCsv, onReset, busy }: ExportButtonsProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.16 }}
      className="stagger-offset"
    >
      <Card>
        <CardHeader>
          <CardTitle>exports + reset</CardTitle>
          <CardDescription>
            download the day’s notes or clear the slate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="button-stack">
            <Button variant="secondary" onClick={onExportJson} disabled={busy}>
              <FileJson className="h-4 w-4" aria-hidden />
              export json
            </Button>
            <Button variant="secondary" onClick={onExportCsv} disabled={busy}>
              <FileJson className="h-4 w-4" aria-hidden />
              export csv
            </Button>
            <Button variant="secondary" onClick={onReset} disabled={busy}>
              <RefreshCcw className="h-4 w-4" aria-hidden />
              reset entries
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
