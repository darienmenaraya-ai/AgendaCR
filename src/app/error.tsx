"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-6 py-16 text-[#172b27]">
      <section
        aria-labelledby="error-title"
        className="w-full max-w-md rounded-[24px] border border-[#e2eae4] bg-white p-8 text-center shadow-sm sm:p-10"
      >
        <p className="text-sm font-semibold tracking-[0.14em] text-[#9a5147]">
          ALGO NO SALIÓ COMO ESPERÁBAMOS
        </p>
        <h1
          className="mt-3 text-3xl font-semibold tracking-tight"
          id="error-title"
        >
          No pudimos cargar esta página
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#71817c]">
          Inténtalo de nuevo. Si el problema continúa, vuelve más tarde.
        </p>
        <button
          className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949]"
          onClick={reset}
          type="button"
        >
          Intentar de nuevo
        </button>
      </section>
    </main>
  );
}
