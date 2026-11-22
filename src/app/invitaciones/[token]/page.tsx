import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";

import { AcceptInvitationForm } from "@/features/staff/components/accept-invitation-form";
import { SwitchAccountButton } from "@/features/staff/components/switch-account-button";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Invitación al equipo",
  description:
    "Acepta la invitación para unirte al equipo de un negocio en AgendaCR.",
};

export default function InvitationPage({ params }: InvitationPageProps) {
  return (
    <Suspense fallback={<InvitationLoading />}>
      <InvitationContent params={params} />
    </Suspense>
  );
}

async function InvitationContent({ params }: InvitationPageProps) {
  await connection();
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return <InvitationUnavailable />;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { db } = await import("@/db");
  const { businesses, staffInvitations } = await import("@/db/schema");
  const [invitation] = await db
    .select({
      email: staffInvitations.email,
      expiresAt: staffInvitations.expiresAt,
      acceptedAt: staffInvitations.acceptedAt,
      revokedAt: staffInvitations.revokedAt,
      businessName: businesses.name,
    })
    .from(staffInvitations)
    .innerJoin(businesses, eq(staffInvitations.businessId, businesses.id))
    .where(eq(staffInvitations.tokenHash, tokenHash))
    .limit(1);

  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= new Date()
  ) {
    return <InvitationUnavailable />;
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  const returnTo = `/invitaciones/${token}`;
  const signInURL = `/iniciar-sesion?callbackURL=${encodeURIComponent(returnTo)}`;
  const signUpURL = `/registro?callbackURL=${encodeURIComponent(returnTo)}`;
  const emailMatches =
    session?.user.email.trim().toLowerCase() === invitation.email;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] px-4 py-10 text-[#172b27]">
      <section className="w-full max-w-lg rounded-[24px] border border-[#e2eae4] bg-white p-6 shadow-[0_18px_60px_rgba(30,67,55,0.08)] sm:p-9">
        <Link
          className="text-sm font-semibold text-[#34735e] hover:underline"
          href="/"
        >
          AgendaCR
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
          INVITACIÓN AL EQUIPO
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Únete a {invitation.businessName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#71817c]">
          Te invitaron como profesional. La invitación vence el{" "}
          {new Intl.DateTimeFormat("es-CR", { dateStyle: "long" }).format(
            invitation.expiresAt,
          )}
          .
        </p>

        {!session ? (
          <div className="mt-7 space-y-3">
            <p className="rounded-xl bg-[#f7f9f6] p-4 text-sm text-[#52645d]">
              Crea una cuenta o inicia sesión con{" "}
              <strong>{invitation.email}</strong> para aceptar.
            </p>
            <Link
              className="flex h-12 items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b]"
              href={signInURL}
            >
              Iniciar sesión
            </Link>
            <Link
              className="flex h-12 items-center justify-center rounded-xl border border-[#dce5df] bg-white px-5 text-sm font-semibold text-[#35554c] transition hover:bg-[#f1f5f1]"
              href={signUpURL}
            >
              Crear una cuenta
            </Link>
          </div>
        ) : emailMatches ? (
          <>
            <p className="mt-5 rounded-xl bg-[#f7f9f6] p-4 text-sm text-[#52645d]">
              Sesión activa: <strong>{session.user.email}</strong>
            </p>
            <AcceptInvitationForm token={token} />
          </>
        ) : (
          <>
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Esta invitación fue enviada a <strong>{invitation.email}</strong>,
              pero tienes abierta otra cuenta. Cierra sesión e inicia con el
              correo invitado.
            </p>
            <SwitchAccountButton />
          </>
        )}
      </section>
    </main>
  );
}

function InvitationUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] px-4 text-[#172b27]">
      <section className="w-full max-w-md rounded-[24px] border border-[#e2eae4] bg-white p-7 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Invitación no disponible</h1>
        <p className="mt-3 text-sm leading-6 text-[#71817c]">
          El enlace venció, fue revocado o ya se utilizó. Pide al propietario
          del negocio que genere uno nuevo.
        </p>
      </section>
    </main>
  );
}

function InvitationLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7f6] px-6 py-16 text-[#71817c]">
      Revisando invitación…
    </main>
  );
}
