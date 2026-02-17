"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useAppStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const { setAuthUser, clearAuthUser, authUser, setRole } = useAppStore();
  const syncedRef = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      // Only sync once per user session (avoid re-calling on every render)
      if (syncedRef.current === user.id) return;
      syncedRef.current = user.id;

      fetch("/api/auth/sync", { method: "POST" })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error("Auth sync HTTP error:", res.status, body);
            throw new Error(`Sync failed: ${res.status} ${body.details || body.error || ''}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Auth sync success:", { userId: data.userId, customerProfileId: data.customerProfileId });
          setAuthUser({
            userId: data.userId,
            customerProfileId: data.customerProfileId,
            providerProfileId: data.providerProfileId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            avatar: data.avatar,
            phone: data.phone,
            businessName: data.businessName,
            businessDescription: data.businessDescription,
            businessPhone: data.businessPhone,
          });

          // Set role based on user's profile — not the URL
          const isDetailer = !!data.providerProfileId;
          setRole(isDetailer ? "detailer" : "customer");

          // Redirect if user is on the wrong base path
          const correctBase = isDetailer ? "/detailer" : "/customer";
          const wrongBase = isDetailer ? "/customer" : "/detailer";
          if (pathname.startsWith(wrongBase)) {
            router.replace(pathname.replace(wrongBase, correctBase));
          }
        })
        .catch((err) => {
          console.error("Auth sync error:", err);
        });
    } else if (!isSignedIn) {
      if (syncedRef.current || authUser) {
        syncedRef.current = null;
        clearAuthUser();
      }
    }
  }, [isSignedIn, user, isLoaded, setAuthUser, clearAuthUser, authUser, setRole, pathname, router]);

  return <>{children}</>;
}
