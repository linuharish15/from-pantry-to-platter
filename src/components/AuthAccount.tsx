import { History, LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => setUser(null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    const refreshHistory = () => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem("pantry-plate-chat-history") || "[]");
        setHistory(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : []);
      } catch {
        setHistory([]);
      }
    };
    refreshHistory();
    window.addEventListener("pantry-plate-history-updated", refreshHistory);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("pantry-plate-history-updated", refreshHistory);
    };
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setError(undefined);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    else setOpen(false);
    setWorking(false);
  };

  const signUp = async () => {
    setWorking(true);
    setError(undefined);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) setError(signUpError.message);
    else setError("Check your email to confirm your account.");
    setWorking(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const clearHistory = () => {
    localStorage.removeItem("pantry-plate-chat-history");
    setHistory([]);
    window.dispatchEvent(new Event("pantry-plate-history-updated"));
  };

  return (
    <div className="relative flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" className="fresh-button" onClick={() => { setHistoryOpen((value) => !value); setOpen(false); }} aria-label="Open chat history" aria-expanded={historyOpen} title="Chat history"><History size={17} /></Button>
      {user ? (
        <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={signOut} title="Sign out"><UserRound size={15} /><span className="hidden sm:inline">Sign out</span><LogOut size={13} /></Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => { setOpen((value) => !value); setHistoryOpen(false); }} aria-expanded={open}><LogIn size={15} /><span>Login</span></Button>
      )}

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[300px] rounded-lg border border-border bg-card p-4 shadow-xl">
          <h3 className="font-display text-xl">Welcome to Pantry & Plate</h3>
          <p className="mt-1 text-xs text-muted-foreground">Sign in or create an account.</p>
          <form onSubmit={signIn} className="mt-3 space-y-2">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={working}>Sign in</Button>
            <Button type="button" variant="outline" className="w-full" disabled={working} onClick={signUp}>Create account</Button>
          </form>
        </div>
      )}

      {historyOpen && (
        <div className="absolute right-0 top-12 z-50 w-[320px] rounded-lg border border-border bg-card p-4 shadow-xl">
          <div className="flex items-center justify-between"><h3 className="font-display text-xl">Chat history</h3>{history.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={clearHistory}>Clear</Button>}</div>
          {history.length ? <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">{history.slice(-12).reverse().map((item, index) => <li key={`${item}-${index}`} className="rounded-md border border-border/70 px-3 py-2 text-xs leading-5">{item}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No saved cooking conversations yet.</p>}
          {!user && <p className="mt-3 text-[11px] text-muted-foreground">Local history is available before sign-in. Account-synced history will appear after Lovable adds the private chat tables.</p>}
        </div>
      )}
    </div>
  );
}
