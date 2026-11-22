"use client";

import { useActionState } from "react";

import {
  createBusinessAction,
  type CreateBusinessState,
} from "@/features/businesses/actions";

const initialState: CreateBusinessState = { error: null };

export function BusinessForm() {
  const [state, action, isPending] = useActionState(
    createBusinessAction,
    initialState,
  );

  return (
    <form action={action} className="mt-6 space-y-5">
      <label className="block space-y-2 text-sm font-medium">
        <span>Nombre del negocio</span>
        <input
          autoComplete="organization"
          className="auth-input"
          maxLength={100}
          minLength={2}
          name="name"
          placeholder="Barbería Central"
          required
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>
          WhatsApp{" "}
          <span className="font-normal text-[#8a9892]">(opcional)</span>
        </span>
        <input
          autoComplete="tel"
          className="auth-input"
          maxLength={30}
          name="whatsapp"
          placeholder="8888-8888"
          type="tel"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>
          Teléfono de contacto{" "}
          <span className="font-normal text-[#8a9892]">(opcional)</span>
        </span>
        <input
          autoComplete="tel"
          className="auth-input"
          maxLength={30}
          name="phone"
          placeholder="8888-8888"
          type="tel"
        />
      </label>
      {state.error && (
        <p
          aria-live="polite"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <button
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Guardando…" : "Guardar mi negocio"}
      </button>
    </form>
  );
}
