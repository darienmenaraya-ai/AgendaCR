import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";

import { BookingForm } from "@/features/appointments/components/booking-form";
import { getLocalDateForInstant } from "@/features/availability/availability";

type PublicBusinessPageProps = {
  params: Promise<{ slug: string }>;
};

const getPublicBusiness = cache(async (slug: string) => {
  const { db } = await import("@/db");
  const { businesses } = await import("@/db/schema");
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      timezone: businesses.timezone,
      phone: businesses.phone,
      whatsapp: businesses.whatsapp,
    })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);

  return business ?? null;
});

export async function generateMetadata({
  params,
}: PublicBusinessPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const business = await getPublicBusiness(slug);

  if (!business) {
    return {
      title: "Negocio no encontrado",
      robots: { index: false, follow: false },
    };
  }

  const title = `Reservas en ${business.name}`;
  const description = `Consulta servicios, disponibilidad y solicita tu cita en línea con ${business.name}.`;
  const url = `/${business.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "AgendaCR",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function PublicBusinessPage({
  params,
}: PublicBusinessPageProps) {
  return (
    <Suspense fallback={<PublicPageLoading />}>
      <PublicBusinessContent params={params} />
    </Suspense>
  );
}

async function PublicBusinessContent({ params }: PublicBusinessPageProps) {
  await connection();
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  const { db } = await import("@/db");
  const { services } = await import("@/db/schema");
  const activeServices = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceCrc: services.priceCrc,
    })
    .from(services)
    .where(
      and(eq(services.businessId, business.id), eq(services.active, true)),
    );
  const publicServices = activeServices;
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  const today = getLocalDateForInstant(new Date(), business.timezone);
  const whatsappDigits = business.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappNumber =
    whatsappDigits.length === 8
      ? `506${whatsappDigits}`
      : whatsappDigits.length === 11 && whatsappDigits.startsWith("506")
        ? whatsappDigits
        : null;

  if (!today) {
    return (
      <p className="p-8 text-center">
        No pudimos cargar el horario de este negocio.
      </p>
    );
  }

  const callbackURL = `/${business.slug}`;
  const signInURL = `/iniciar-sesion?callbackURL=${encodeURIComponent(callbackURL)}`;
  const signUpURL = `/registro?callbackURL=${encodeURIComponent(callbackURL)}`;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#172b27]">
      <header className="border-b border-[#e8ede8] bg-white/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#1e5949] text-[#c5efd2]">
              <CalendarMark />
            </span>
            <span className="text-xl">AgendaCR</span>
          </Link>
          {session ? (
            <Link
              className="text-sm font-semibold text-[#34735e] hover:underline"
              href="/inicio"
            >
              Mi espacio
            </Link>
          ) : (
            <Link
              className="text-sm font-semibold text-[#34735e] hover:underline"
              href={signInURL}
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#34735e]">
            RESERVA EN LÍNEA
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {business.name}
          </h1>
          <p className="mt-4 max-w-lg leading-7 text-[#52645d]">
            Escoge el servicio y el horario que mejor se ajuste a tu día. Las
            horas se muestran en la zona horaria del negocio.
          </p>
          {business.phone && (
            <p className="mt-6 text-sm text-[#52645d]">
              Teléfono: {business.phone}
            </p>
          )}
          {whatsappNumber && (
            <a
              className="mt-2 inline-flex text-sm font-semibold text-[#34735e] hover:underline"
              href={`https://wa.me/${whatsappNumber}`}
              rel="noreferrer"
              target="_blank"
            >
              Escribir por WhatsApp
            </a>
          )}

          <div className="mt-10">
            <h2 className="text-sm font-semibold">Servicios disponibles</h2>
            {publicServices.length === 0 ? (
              <p className="mt-3 rounded-xl border border-[#e2eae4] bg-white p-4 text-sm text-[#52645d]">
                Este negocio todavía no ha publicado servicios.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {publicServices.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#e2eae4] bg-white p-4"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {service.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#52645d]">
                        {service.durationMinutes} minutos
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#1e5949]">
                      {new Intl.NumberFormat("es-CR", {
                        style: "currency",
                        currency: "CRC",
                        maximumFractionDigits: 0,
                      }).format(service.priceCrc)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <section className="h-fit rounded-[24px] border border-[#e2eae4] bg-white p-5 shadow-[0_18px_60px_rgba(30,67,55,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
            ELIGE TU ESPACIO
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Solicita una cita
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#52645d]">
            {publicServices.length === 0
              ? "Este negocio todavía no tiene servicios para reservar."
              : session
                ? "Selecciona un horario libre y envía tu solicitud al negocio."
                : "Para reservar, inicia sesión o crea tu cuenta gratis."}
          </p>

          {session ? (
            publicServices.length > 0 ? (
              <div className="mt-7">
                <BookingForm
                  businessId={business.id}
                  services={publicServices}
                  timeZone={business.timezone}
                  today={today}
                />
              </div>
            ) : (
              <p className="mt-7 rounded-xl border border-[#e2eae4] bg-[#f7f9f6] p-4 text-sm leading-6 text-[#52645d]">
                Vuelve más adelante o contacta directamente al negocio para
                consultar sus servicios.
              </p>
            )
          ) : publicServices.length > 0 ? (
            <div className="mt-7 space-y-3">
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
          ) : (
            <p className="mt-7 rounded-xl border border-[#e2eae4] bg-[#f7f9f6] p-4 text-sm leading-6 text-[#52645d]">
              Las reservas estarán disponibles cuando el negocio publique sus
              servicios.
            </p>
          )}
        </section>
      </section>
      <footer className="mx-auto max-w-6xl px-6 py-7 text-xs text-[#52645d] sm:px-10">
        Reservas organizadas con AgendaCR · Costa Rica
      </footer>
    </main>
  );
}

function PublicPageLoading() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-6 py-16 text-[#52645d]">
      Cargando perfil del negocio…
    </main>
  );
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
