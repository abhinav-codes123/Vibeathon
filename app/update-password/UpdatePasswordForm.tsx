"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = await getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      window.location.assign("/account?password=updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update password.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>New password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Confirm password<input type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
      {message && <p className="auth-message error">{message}</p>}
      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
