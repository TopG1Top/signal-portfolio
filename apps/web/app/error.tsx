'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Connection interrupted</h1>
      <p>SIGNAL could not load this view. Your saved data remains in the database.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
