"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function StaffInvitePage() {
  const [message, setMessage] = useState("Accepting your FlowDine invitation…");

  useEffect(() => {
    let cancelled = false;

    async function acceptInvitation() {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const errorDescription = fragment.get("error_description");

      if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        return;
      }
      if (!accessToken || !refreshToken) {
        setMessage(
          "This invitation link is invalid or has expired. Ask your manager to send a new invitation.",
        );
        return;
      }

      const supabase = await getSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (cancelled) return;
      if (error) {
        setMessage(error.message);
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace("/workspace");
    }

    acceptInvitation().catch((error: unknown) => {
      if (!cancelled) {
        setMessage(
          error instanceof Error
            ? error.message
            : "The invitation could not be accepted.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        <p className="eyebrow">Staff invitation</p>
        <h1>Welcome to FlowDine</h1>
        <p>{message}</p>
        <p className="auth-note">
          Your role is assigned by the restaurant. It cannot be changed from
          your Google profile or account settings.
        </p>
      </section>
    </main>
  );
}
