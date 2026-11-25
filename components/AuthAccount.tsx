import type { User } from "@supabase/supabase-js";
import { Eye, EyeOff, LogIn, LogOut, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup";

export function AuthAccount({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string }>();
  const [working, setWorking] = useState(false);

  const reset = () => { setMessage(undefined); setPassword(""); setShowPassword(false); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setMessage(undefined);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMessage({ kind: "error", text: error.message });
        else { setOpen(false); reset(); }
      } else {
        if (password.length < 8) {
          setMessage({ kind: "error", text: "Please choose a password with at least 8 characters." });
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setMessage({ kind: "error", text: error.message });
        else if (data.session) { setOpen(false); reset(); }
        else setMessage({ kind: "info", text: "Almost there! Please check your email and confirm your account, then sign in." });
      }
    } catch {
      setMessage({ kind: "error", text: "We could not reach the sign-in service. Please try again." });
    } finally {
      setWorking(false);
    }
  };

  if (user) {
    const label = user.email ?? "Account";
    return (
      <div className="account-chip">
        <span className="account-avatar" aria-hidden="true">{label.charAt(0).toUpperCase()}</span>
        <span className="account-email">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void supabase.auth.signOut()}><LogOut /> <span className="hide-small">Sign out</span></Button>
      </div>
    );
  }

  return (
    <>
      <Button type="button" className="login-button" onClick={() => { setMode("signin"); reset(); setOpen(true); }}><LogIn /> Login</Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
        <DialogContent className="auth-dialog">
          <DialogHeader>
            <DialogTitle className="dialog-title">{mode === "signin" ? "Welcome back, chef!" : "Create your account"}</DialogTitle>
            <DialogDescription className="dialog-copy">
              {mode === "signin" ? "Sign in to keep your chat history for your own account on this device." : "All you need is an email and a password."}
            </DialogDescription>
          </DialogHeader>
          <div className="auth-switch" role="tablist" aria-label="Sign in or create account">
            <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setMessage(undefined); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setMessage(undefined); }}>Create account</button>
          </div>
          <form onSubmit={(event) => void submit(event)} className="auth-form">
            <label htmlFor="auth-email" className="field-label">Email address</label>
            <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="select-input" placeholder="you@example.com" />
            <label htmlFor="auth-password" className="field-label">Password</label>
            <div className="password-wrap">
              <input id="auth-password" type={showPassword ? "text" : "password"} required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="select-input" placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </div>
            {message && <p className={message.kind === "error" ? "error-note" : "info-note"} role="alert">{message.text}</p>}
            <Button type="submit" className="auth-submit" disabled={working}><UserRound /> {working ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
