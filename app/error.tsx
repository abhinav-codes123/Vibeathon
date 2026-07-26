"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="route-state">
      <p className="eyebrow">Connection interrupted</p>
      <h1>The restaurant state did not load.</h1>
      <p>Your last confirmed action remains preserved. Retry to reconnect to the live service.</p>
      <button className="button primary" onClick={reset}>Retry synchronization</button>
    </main>
  );
}
