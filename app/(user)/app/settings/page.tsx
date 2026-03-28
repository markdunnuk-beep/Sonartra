export default function UserSettingsPage() {
  return (
    <main className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">User App</p>
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="max-w-2xl text-sm text-white/60">
          User-level preferences and account controls will live here as the authenticated app expands.
        </p>
      </header>

      <section className="sonartra-panel">
        <h2 className="text-lg font-semibold text-white">Settings surface ready</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          The shell is in place so future settings sections can be added without changing the authenticated layout.
        </p>
      </section>
    </main>
  );
}
