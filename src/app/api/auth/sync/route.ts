import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);

    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? "";
    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";
    const avatar = clerkUser.imageUrl ?? null;
    const phone =
      clerkUser.phoneNumbers.find(
        (p) => p.id === clerkUser.primaryPhoneNumberId
      )?.phoneNumber ?? null;

    // Read sign-up role cookies
    const cookieStore = await cookies();
    const signupRole = cookieStore.get("tumaro_signup_role")?.value || null;
    const businessName = cookieStore.get("tumaro_business_name")?.value
      ? decodeURIComponent(cookieStore.get("tumaro_business_name")!.value)
      : null;

    // Upsert User by clerkUserId
    const user = await prisma.user.upsert({
      where: { clerkUserId },
      update: {
        email,
        firstName,
        lastName,
        avatar,
        phone,
        lastLoginAt: new Date(),
      },
      create: {
        clerkUserId,
        email,
        firstName,
        lastName,
        avatar,
        phone,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
      include: {
        customerProfile: true,
        providerProfile: true,
      },
    });

    // Auto-create CustomerProfile if missing
    if (!user.customerProfile) {
      await prisma.customerProfile.create({
        data: { userId: user.id },
      });
    }

    // Create ProviderProfile for business sign-ups
    if (signupRole === "business" && !user.providerProfile) {
      await prisma.providerProfile.create({
        data: {
          userId: user.id,
          businessName: businessName || `${firstName}'s Detailing`,
        },
      });
    }

    // Re-fetch to get fresh profile IDs
    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        customerProfile: true,
        providerProfile: true,
      },
    });

    // Build response and clear sign-up cookies
    const response = NextResponse.json({
      userId: freshUser!.id,
      customerProfileId: freshUser!.customerProfile?.id ?? null,
      providerProfileId: freshUser!.providerProfile?.id ?? null,
      firstName,
      lastName,
      email,
      avatar,
      phone,
      businessName: freshUser!.providerProfile?.businessName ?? null,
      businessDescription: freshUser!.providerProfile?.businessDescription ?? null,
      businessPhone: freshUser!.providerProfile?.businessPhone ?? null,
    });

    // Clear sign-up cookies
    if (signupRole) {
      response.cookies.set("tumaro_signup_role", "", { maxAge: 0, path: "/" });
      response.cookies.set("tumaro_business_name", "", { maxAge: 0, path: "/" });
    }

    return response;
  } catch (error: any) {
    console.error("Auth sync error:", error);
    return NextResponse.json(
      { error: "Auth sync failed", details: error.message?.substring(0, 500) },
      { status: 500 }
    );
  }
}
