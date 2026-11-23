"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  updateBusinessAction,
  type UpdateBusinessState,
} from "@/features/businesses/actions";

type BusinessProfile = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  whatsapp: string | null;
};

const initialState: UpdateBusinessState = { error: null, success: null };

export function BusinessProfileForm({
  business,
}: {
  business: BusinessProfile;
}) {
  const [state, action, isPending] = useActionState(
    updateBusinessAction,
    initialState,
  );

  return (
    <article className="rounded-xl border border-[#e6ede8] bg-[#fbfcfa] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{business.name}</h3>
          <Link
            className="mt-1 inline-flex text-sm font-medium text-[#34735e] hover:underline"
            href={`/${business.slug}`}
            target="_blank"
          >
            Ver página pública{" "}
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </Link>
        </div>
      </div>

      <details className="mt-4 border-t border-[#e6ede8] pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#52645d]">
          Editar datos del negocio
        </summary>
        <form action={action} className="mt-4 space-y-4">
          <input name="businessId" type="hidden" value={business.id} />
          <label className="block space-y-2 text-sm font-medium">
            <span>Nombre</span>
            <input
              autoComplete="organization"
              className="auth-input"
              defaultValue={business.name}
              maxLength={100}
              minLength={2}
              name="name"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              <span>
                Teléfono{" "}
                <span className="font-normal text-[#52645d]">(opcional)</span>
              </span>
              <input
                autoComplete="tel"
                className="auth-input"
                defaultValue={business.phone ?? ""}
                maxLength={30}
                name="phone"
                type="tel"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>
                WhatsApp{" "}
                <span className="font-normal text-[#52645d]">(opcional)</span>
              </span>
              <input
                autoComplete="tel"
                className="auth-input"
                defaultValue={business.whatsapp ?? ""}
                maxLength={30}
                name="whatsapp"
                type="tel"
              />
            </label>
          </div>
          {state.error && (
            <p aria-live="polite" className="text-sm text-red-700" role="alert">
              {state.error}
            </p>
          )}
          {state.success && (
            <p
              aria-live="polite"
              className="text-sm text-[#34735e]"
              role="status"
            >
              {state.success}
            </p>
          )}
          <button
            className="flex h-10 items-center justify-center rounded-xl bg-[#1e5949] px-4 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </details>
    </article>
  );
}
