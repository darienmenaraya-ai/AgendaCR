"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SwitchAccountButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.refresh(),
        onError: () => setIsPending(false),
      },
    });
  }

  return (
    <button
      className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] disabled:opacity-60"
      disabled={isPending}
      onClick={signOut}
      type="button"
    >
      {isPending ? "Cerrando sesión…" : "Cambiar de cuenta"}
    </button>
  );
}
