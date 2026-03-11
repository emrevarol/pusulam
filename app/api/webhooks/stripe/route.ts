import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

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
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (userId && purchaseId && credits > 0) {
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
          data: { credits: { increment: credits } },
        }),
      ]);
    }
  }

  return NextResponse.json({ received: true });
}
