import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5] text-[#172b27]">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 px-6 py-5 sm:flex-nowrap sm:gap-y-0 sm:px-10 lg:px-12">
        <Link
          href="/"
          aria-label="AgendaCR, inicio"
          className="flex items-center"
        >
          <BrandLogo className="h-8 w-auto sm:h-9" />
        </Link>
        <nav className="ml-auto flex items-center gap-0 text-sm font-semibold sm:gap-3">
          <Link
            className="whitespace-nowrap rounded-xl px-1.5 py-2.5 text-[#35554c] transition hover:bg-white sm:px-4"
            href="/iniciar-sesion"
          >
            Iniciar sesión
          </Link>
          <Link
            className="whitespace-nowrap rounded-xl bg-[#1e5949] px-1.5 py-2.5 text-white transition hover:bg-[#17483b] sm:px-4"
            href="/registro"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 sm:px-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-28 lg:pt-20">
        <div className="absolute -left-56 top-10 -z-0 size-[500px] rounded-full bg-[#e5f0e8] blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c9dfd0] bg-white/75 px-3.5 py-2 text-xs font-semibold tracking-wide text-[#34735e]">
            <span className="size-2 rounded-full bg-[#58a878]" />
            AGENDA SIMPLE PARA NEGOCIOS LOCALES
          </span>
          <h1 className="mt-7 text-[46px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-[68px]">
            Tu negocio fluye mejor cuando tu agenda también.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#64766f] sm:text-lg sm:leading-8">
            Organiza las citas de tu negocio en un solo lugar. Menos mensajes
            para coordinar, más tiempo para atender a tus clientes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#1e5949] px-6 text-sm font-semibold text-white shadow-lg shadow-[#1e5949]/15 transition hover:-translate-y-0.5 hover:bg-[#17483b]"
              href="/registro"
            >
              Empieza a organizarte{" "}
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce5df] bg-white px-6 text-sm font-semibold text-[#35554c] transition hover:bg-[#f1f5f1]"
              href="/iniciar-sesion"
            >
              Ya tengo una cuenta
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-3 text-sm text-[#52645d]">
            <span className="flex -space-x-2">
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#f7f8f5] bg-[#f3c9a8] text-[10px] font-semibold text-[#543925]">
                CR
              </span>
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#f7f8f5] bg-[#c9e6d0] text-xs font-semibold text-[#1e5949]">
                ✓
              </span>
            </span>
            Diseñada pensando en Costa Rica
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-lg lg:ml-auto">
          <div className="absolute -right-5 -top-6 size-28 rounded-full bg-[#d8eddf]" />
          <div className="relative rounded-[28px] border border-white bg-white p-5 shadow-[0_28px_90px_rgba(30,67,55,0.14)] sm:p-7">
            <div className="flex items-center justify-between border-b border-[#edf1ed] pb-5">
              <div>
                <p className="text-sm font-semibold">Agenda de hoy</p>
                <p className="mt-1 text-xs text-[#52645d]">
                  Martes · San José, Costa Rica
                </p>
              </div>
              <span className="rounded-lg bg-[#eff7f0] px-3 py-2 text-xs font-semibold text-[#34735e]">
                Hoy
              </span>
            </div>
            <div className="mt-5 space-y-3">
              <Appointment
                time="9:00"
                name="Corte clásico"
                person="Andrés M."
                tone="green"
              />
              <Appointment
                time="10:30"
                name="Color y tratamiento"
                person="Sofía R."
                tone="peach"
              />
              <Appointment
                time="12:00"
                name="Corte + barba"
                person="Daniel C."
                tone="blue"
              />
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#f6f8f5] px-4 py-3.5">
              <span className="text-xs font-medium text-[#52645d]">
                Próxima cita en
              </span>
              <span className="text-sm font-semibold text-[#1e5949]">
                24 min
              </span>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-8 hidden rounded-2xl border border-white bg-white px-4 py-3 shadow-xl shadow-[#1e5949]/10 sm:block">
            <p className="text-[11px] text-[#52645d]">Citas organizadas</p>
            <p className="mt-1 text-lg font-semibold text-[#1e5949]">
              Todo en orden <span aria-hidden="true">✓</span>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e8ede8] bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-3 sm:px-10 lg:px-12">
          <Feature
            title="Tu agenda, clara"
            text="Consulta las citas del día de un vistazo y mantén cada horario organizado."
            number="01"
          />
          <Feature
            title="Menos coordinación"
            text="Centraliza la información de tus servicios y las reservas de tus clientes."
            number="02"
          />
          <Feature
            title="Hecho para crecer"
            text="Empieza con lo esencial y configura tu negocio paso a paso."
            number="03"
          />
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl justify-between px-6 py-6 text-xs text-[#52645d] sm:px-10 lg:px-12">
        <span>© 2026 AgendaCR</span>
        <span>Hecho en Costa Rica</span>
      </footer>
    </main>
  );
}

function Appointment({
  time,
  name,
  person,
  tone,
}: {
  time: string;
  name: string;
  person: string;
  tone: "green" | "peach" | "blue";
}) {
  const colors = {
    green: "border-l-[#6eb48a] bg-[#f4faf5]",
    peach: "border-l-[#e7a980] bg-[#fff8f3]",
    blue: "border-l-[#83a9c5] bg-[#f4f8fb]",
  };
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border-l-[3px] px-3.5 py-3 ${colors[tone]}`}
    >
      <span className="w-12 text-xs font-semibold text-[#52645d]">{time}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#30453e]">
          {name}
        </span>
        <span className="mt-0.5 block text-xs text-[#52645d]">{person}</span>
      </span>
      <span className="size-2 rounded-full bg-[#6eb48a]" />
    </div>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="flex gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff7f0] text-xs font-semibold text-[#34735e]">
        {number}
      </span>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-[#52645d]">{text}</p>
      </div>
    </article>
  );
}
