"use client";

import { useActionState, useState } from "react";

import {
  createStaffInvitationAction,
  type InvitationActionState,
} from "@/features/staff/actions";

const initialState: InvitationActionState = { error: null, inviteUrl: null };

export function InviteStaffForm({ businessId }: { businessId: string }) {
  const [state, action, isPending] = useActionState(
    createStaffInvitationAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <input name="businessId" type="hidden" value={businessId} />
      <label className="block max-w-lg space-y-2 text-sm font-medium">
        <span>Correo de la persona</span>
        <input
          autoComplete="email"
          className="auth-input"
          name="email"
          placeholder="persona@correo.com"
          required
          type="email"
        />
      </label>
      {state.error && (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.inviteUrl && (
        <div className="rounded-xl border border-[#cfe4d5] bg-[#f3faf4] p-4">
          <p className="text-sm font-semibold text-[#1e5949]">
            {state.emailStatus === "sent"
              ? "Invitación enviada por correo"
              : "Invitación creada; comparte el enlace"}
          </p>
          {state.emailStatus !== "sent" && (
            <p className="mt-1 text-xs leading-5 text-[#71817c]">
              {state.emailStatus === "not-configured"
                ? "Configura Resend para enviar invitaciones automáticamente."
                : state.emailStatus === "failed"
                  ? "No se pudo enviar el correo. Puedes compartir este enlace manualmente."
                  : "El correo también se enviará si Resend está configurado."}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Enlace de invitación"
              className="auth-input h-10 min-w-0 flex-1 text-xs"
              readOnly
              value={state.inviteUrl}
            />
            <button
              className="h-10 rounded-xl bg-[#1e5949] px-4 text-sm font-semibold text-white transition hover:bg-[#17483b]"
              onClick={copyInviteLink}
              type="button"
            >
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#71817c]">
            Este enlace se muestra solo ahora. Si lo pierdes, genera una
            invitación nueva para invalidar el anterior.
          </p>
        </div>
      )}
      <button
        className="flex h-11 items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando invitación…" : "Enviar invitación"}
      </button>
    </form>
  );
}
