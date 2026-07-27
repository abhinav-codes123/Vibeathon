"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getSupabaseBrowserClient,
  getSupabaseBrowserConfig,
} from "../../lib/supabase/client";

type Mode = "signin" | "signup" | "recover";

export function AuthForm({
  next,
  initialError,
}: {
  next: string;
  initialError: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [tone, setTone] = useState<"error" | "success">("error");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void getSupabaseBrowserConfig()
      .then((config) => {
        if (active) setGoogleEnabled(config.providers.google);
      })
      .catch(() => {
        if (active) setGoogleEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const show = (value: string, nextTone: "error" | "success" = "error") => {
    setMessage(value);
    setTone(nextTone);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    show("");
    try {
      const supabase = await getSupabaseBrowserClient();
      if (mode === "recover") {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/update-password")}`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
        show("Check your email for the secure password-reset link.", "success");
        return;
      }

      if (mode === "signup") {
        const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          window.location.assign(next);
          return;
        }
        show(
          "Account created. Confirm the verification email before signing in.",
          "success",
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign(next);
    } catch (error) {
      show(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    show("");
    try {
      const supabase = await getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error) {
      show(error instanceof Error ? error.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="auth-form-panel">
      <div className="auth-tabs" aria-label="Authentication mode">
        <button
          className={mode === "signin" ? "active" : ""}
          onClick={() => { setMode("signin"); show(""); }}
          type="button"
        >
          Sign in
        </button>
        <button
          className={mode === "signup" ? "active" : ""}
          onClick={() => { setMode("signup"); show(""); }}
          type="button"
        >
          Create account
        </button>
      </div>
      <h2>
        {mode === "signin"
          ? "Welcome back"
          : mode === "signup"
            ? "Create your verified account"
            : "Reset your password"}
      </h2>
      <p>
        {mode === "recover"
          ? "We will email a single-use recovery link."
          : "Staff roles are assigned by the restaurant owner and cannot be selected here."}
      </p>

      {mode !== "recover" && googleEnabled && (
        <button
          className="google-button"
          disabled={busy}
          onClick={() => void signInWithGoogle()}
          type="button"
        >
          <span aria-hidden="true">G</span> Continue with Google
        </button>
      )}

      {mode !== "recover" && googleEnabled && (
        <div className="auth-divider"><span>or use email</span></div>
      )}

      {mode !== "recover" && !googleEnabled && (
        <p className="auth-provider-note">
          Google sign-in is not enabled yet. Use your verified email account.
        </p>
      )}

      <form onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Full name
            <input
              autoComplete="name"
              maxLength={100}
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>
        )}
        <label>
          Email address
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        {mode !== "recover" && (
          <label>
            Password
            <input
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
        )}
        {message && (
          <p className={`auth-message ${tone}`} role="status">
            {message}
          </p>
        )}
        <button className="button primary auth-submit" disabled={busy} type="submit">
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in securely"
              : mode === "signup"
                ? "Create account"
                : "Send recovery email"}
        </button>
      </form>
      <button
        className="auth-text-button"
        onClick={() => {
          setMode(mode === "recover" ? "signin" : "recover");
          show("");
        }}
        type="button"
      >
        {mode === "recover" ? "Back to sign in" : "Forgot your password?"}
      </button>
    </div>
  );
}
