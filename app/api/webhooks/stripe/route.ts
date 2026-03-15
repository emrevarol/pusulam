import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { TIERS } from "@/lib/tiers";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const purchaseId = session.metadata?.purchaseId;
    const oyHakki = parseInt(session.metadata?.oyHakki || session.metadata?.credits || "0", 10);

    if (userId && purchaseId && oyHakki > 0) {
      await prisma.$transaction([
        prisma.creditPurchase.update({
          where: { id: purchaseId },
          data: {
            status: "COMPLETED",
            stripePaymentId: session.payment_intent as string,
            completedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { oyHakki: { increment: oyHakki } },
        }),
      ]);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const purchaseId = session.metadata?.purchaseId;
    if (purchaseId) {
      await prisma.creditPurchase.update({
        where: { id: purchaseId },
        data: { status: "EXPIRED" },
      });
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent as string;
    if (paymentIntentId) {
      const purchase = await prisma.creditPurchase.findFirst({
        where: { stripePaymentId: paymentIntentId, status: "COMPLETED" },
      });
      if (purchase) {
        await prisma.$transaction([
          prisma.creditPurchase.update({
            where: { id: purchase.id },
            data: { status: "REFUNDED" },
          }),
          prisma.user.update({
            where: { id: purchase.userId },
            data: { oyHakki: { decrement: purchase.amount } },
          }),
        ]);
      }
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    const paymentIntentId = dispute.payment_intent as string;
    if (paymentIntentId) {
      const purchase = await prisma.creditPurchase.findFirst({
        where: { stripePaymentId: paymentIntentId, status: "COMPLETED" },
      });
      if (purchase) {
        await prisma.$transaction([
          prisma.creditPurchase.update({
            where: { id: purchase.id },
            data: { status: "DISPUTED" },
          }),
          prisma.user.update({
            where: { id: purchase.userId },
            data: { oyHakki: { decrement: purchase.amount } },
          }),
        ]);
      }
    }
  }

  // Subscription events
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as { id: string; customer: string; status: string; current_period_end: number };
    const user = await prisma.user.findFirst({ where: { stripeCustomerId: subscription.customer } });
    if (user) {
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: isActive ? "PREMIUM" : "FREE",
          stripeSubscriptionId: subscription.id,
          planExpiresAt: isActive
            ? new Date(subscription.current_period_end * 1000)
            : null,
          streakFreezes: isActive ? TIERS.PREMIUM.streakFreezesPerMonth : 0,
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as { customer: string };
    const user = await prisma.user.findFirst({ where: { stripeCustomerId: subscription.customer } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "FREE",
          planExpiresAt: null,
          stripeSubscriptionId: null,
          streakFreezes: 0,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
