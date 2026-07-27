import type { Metadata } from "next";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata: Metadata = { title: "Update password" };

export default function UpdatePasswordPage() {
  return (
    <main className="auth-page compact-auth-page">
      <section className="auth-form-panel standalone-auth-form">
        <p className="eyebrow">Account recovery</p>
        <h1>Choose a new password.</h1>
        <p>Use at least eight characters and keep it unique to FlowDine.</p>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
