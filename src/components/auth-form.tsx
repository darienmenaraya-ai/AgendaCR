"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { signInSchema, signUpSchema } from "@/lib/auth-validation";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const callbackURL = getSafeCallbackURL();
    setIsPending(true);

    try {
      let result;

      if (isSignUp) {
        const values = signUpSchema.safeParse({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        });

        if (!values.success) {
          setErrorMessage(
            values.error.issues[0]?.message ??
              "Revisa los datos e inténtalo de nuevo.",
          );
          return;
        }

        result = await authClient.signUp.email({
          ...values.data,
          callbackURL: new URL(callbackURL, window.location.origin).toString(),
        });
      } else {
        const values = signInSchema.safeParse({
          email: formData.get("email"),
          password: formData.get("password"),
        });

        if (!values.success) {
          setErrorMessage(
            values.error.issues[0]?.message ??
              "Revisa los datos e inténtalo de nuevo.",
          );
          return;
        }

        result = await authClient.signIn.email({
          ...values.data,
          callbackURL: new URL(callbackURL, window.location.origin).toString(),
        });
      }

      if (result.error) {
        setErrorMessage(
          isSignUp
            ? "No pudimos crear la cuenta. Revisa tus datos o prueba con otro correo."
            : "El correo o la contraseña no coinciden. Inténtalo de nuevo.",
        );
        return;
      }

      router.push(callbackURL);
      router.refresh();
    } catch {
      setErrorMessage(
        "No fue posible conectar. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] px-4 py-10 text-[#172b27] sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(28,54,47,0.12)] lg:min-h-[650px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#163e35] p-10 text-white lg:flex xl:p-12">
          <div className="absolute -right-28 -top-24 size-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-20 size-96 rounded-full border border-white/10" />
          <Link
            href="/"
            className="relative flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#b9e6c9] text-[#163e35]">
              <CalendarMark />
            </span>
            <span className="text-xl">AgendaCR</span>
          </Link>

          <div className="relative max-w-sm">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-[#b9e6c9]">
              Tu tiempo, mejor organizado
            </p>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight xl:text-[46px]">
              Cada cita en su lugar. Cada día, más sencillo.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/70">
              Una agenda clara para los negocios que hacen grande a Costa Rica.
            </p>
          </div>

          <div className="relative flex items-center gap-3 text-sm text-white/70">
            <span className="flex -space-x-2">
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#163e35] bg-[#f3c9a8] text-xs text-[#543925]">
                CR
              </span>
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#163e35] bg-[#b9e6c9] text-xs text-[#163e35]">
                ✓
              </span>
            </span>
            Hecha para negocios locales
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-10 flex items-center gap-2 font-semibold tracking-tight lg:hidden"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#163e35] text-[#b9e6c9]">
                <CalendarMark />
              </span>
              <span className="text-lg">AgendaCR</span>
            </Link>
            <p className="text-sm font-medium text-[#34735e]">
              {isSignUp ? "EMPIEZA GRATIS" : "QUÉ BUENO VERTE"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[34px]">
              {isSignUp ? "Crea tu cuenta" : "Inicia sesión"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#71817c]">
              {isSignUp
                ? "Organiza tus citas y dedica más tiempo a tus clientes."
                : "Ingresa para continuar con tu agenda."}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              {isSignUp && (
                <label className="block space-y-2 text-sm font-medium">
                  <span>Nombre completo</span>
                  <input
                    autoComplete="name"
                    className="auth-input"
                    name="name"
                    placeholder="María Rodríguez"
                    required
                  />
                </label>
              )}
              <label className="block space-y-2 text-sm font-medium">
                <span>Correo electrónico</span>
                <input
                  autoComplete="email"
                  className="auth-input"
                  name="email"
                  placeholder="tu@correo.com"
                  required
                  type="email"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Contraseña</span>
                <input
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="auth-input"
                  name="password"
                  placeholder="Al menos 8 caracteres"
                  required
                  type="password"
                />
              </label>

              {errorMessage && (
                <p
                  aria-live="polite"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <button
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {isPending
                  ? "Un momento…"
                  : isSignUp
                    ? "Crear cuenta"
                    : "Entrar a mi cuenta"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#71817c]">
              {isSignUp ? "¿Ya tienes cuenta?" : "¿Primera vez en AgendaCR?"}{" "}
              <Link
                className="font-semibold text-[#1e5949] hover:underline"
                href={isSignUp ? "/iniciar-sesion" : "/registro"}
                onClick={(event) => {
                  const returnTo = getSafeCallbackURL();
                  if (returnTo !== "/inicio") {
                    event.preventDefault();
                    const nextPath = isSignUp ? "/iniciar-sesion" : "/registro";
                    router.push(
                      `${nextPath}?callbackURL=${encodeURIComponent(returnTo)}`,
                    );
                  }
                }}
              >
                {isSignUp ? "Inicia sesión" : "Crea una cuenta"}
              </Link>
            </p>
            <p className="mt-10 text-center text-xs leading-5 text-[#98a49f]">
              Al continuar, aceptas nuestros términos de servicio y política de
              privacidad.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function getSafeCallbackURL(): string {
  const candidate = new URLSearchParams(window.location.search).get(
    "callbackURL",
  );
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return "/inicio";
  }

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return "/inicio";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/inicio";
  }
}

function CalendarMark() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="5"
      />
      <path
        d="M16 3v4M8 3v4M3 10h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="m9 15 2 2 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
