import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { CREDIT_PACKAGES } from "@/lib/credits";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packageId } = await request.json();
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const purchase = await prisma.creditPurchase.create({
    data: {
      amount: pkg.credits,
      priceUsd: pkg.priceUsd,
      stripeSessionId: "pending_" + Date.now(),
      userId: session.user.id,
    },
  });

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Pusulam ${pkg.credits} Kredi`,
            description: `${pkg.credits} prediction credits for Pusulam`,
          },
          unit_amount: pkg.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.user.id,
      purchaseId: purchase.id,
      credits: String(pkg.credits),
    },
    success_url: `${process.env.NEXTAUTH_URL}/tr/kredi?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/tr/kredi?canceled=true`,
  });

  // Update purchase with real session ID
  await prisma.creditPurchase.update({
    where: { id: purchase.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
