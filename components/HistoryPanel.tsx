import { History, MessageCircle, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { clearHistory, deleteHistoryEntry, HISTORY_EVENT, loadHistory, type HistoryEntry } from "@/lib/history";

type HistoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userKey: string;
  signedIn: boolean;
  onOpenEntry: (entry: HistoryEntry) => void;
};

function formatWhen(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function HistoryButton({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <Button type="button" variant="outline" className="history-button" onClick={onClick}>
      <History /> <span>Chat history</span>{count > 0 && <span className="history-count">{count}</span>}
    </Button>
  );
}

export function useHistoryEntries(userKey: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    const refresh = () => setEntries(loadHistory(userKey));
    refresh();
    window.addEventListener(HISTORY_EVENT, refresh);
    return () => window.removeEventListener(HISTORY_EVENT, refresh);
  }, [userKey]);
  return entries;
}

export function HistoryPanel({ open, onOpenChange, userKey, signedIn, onOpenEntry }: HistoryPanelProps) {
  const entries = useHistoryEntries(userKey);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="history-sheet">
        <SheetHeader>
          <SheetTitle className="dialog-title">Chat history</SheetTitle>
          <SheetDescription className="dialog-copy">
            {signedIn ? "Saved for your account on this device." : "Saved on this device. Log in to keep your own history separate."}
          </SheetDescription>
        </SheetHeader>

        {entries.length === 0 ? (
          <p className="history-empty">Nothing here yet. Your recipe searches and Chef conversations will appear here.</p>
        ) : (
          <>
            <ul className="history-list">
              {entries.map((entry) => (
                <li key={entry.id} className="history-item">
                  <button type="button" className="history-open" onClick={() => { onOpenEntry(entry); onOpenChange(false); }}>
                    <span className={`history-icon ${entry.kind === "chat" ? "history-icon-chat" : ""}`} aria-hidden="true">{entry.kind === "chat" ? <MessageCircle /> : <UtensilsCrossed />}</span>
                    <span className="history-text">
                      <span className="history-title">{entry.title}</span>
                      <span className="history-when">{entry.kind === "chat" ? "Kitchen Consultation" : "Recipe ideas"} · {formatWhen(entry.createdAt)}</span>
                    </span>
                  </button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => deleteHistoryEntry(userKey, entry.id)} aria-label={`Delete ${entry.title}`}><X /></Button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" className="history-clear" onClick={() => clearHistory(userKey)}><Trash2 /> Clear all history</Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
