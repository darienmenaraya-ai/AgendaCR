"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  }

  return (
    <button
      className="rounded-xl border border-[#dce5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#35554c] transition hover:bg-[#f1f5f1]"
      onClick={handleSignOut}
      type="button"
    >
      Cerrar sesión
    </button>
  );
}
