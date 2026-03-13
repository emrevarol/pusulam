import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { OY_HAKKI_PACKAGES } from "@/lib/credits";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packageId } = await request.json();
  const pkg = OY_HAKKI_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured. Payment is not available yet." },
      { status: 503 }
    );
  }

  try {
    const purchase = await prisma.creditPurchase.create({
      data: {
        amount: pkg.amount,
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
              name: `Pusulam ${pkg.amount} Oy Hakki`,
              description: `${pkg.amount} vote rights for Pusulam`,
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        purchaseId: purchase.id,
        oyHakki: String(pkg.amount),
      },
      success_url: `${process.env.NEXTAUTH_URL}/tr/kredi?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/tr/kredi?canceled=true`,
    });

    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Payment service error: ${message}` },
      { status: 500 }
    );
  }
}
