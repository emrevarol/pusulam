import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { TIERS } from "@/lib/tiers";

// GET: Check subscription status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, planExpiresAt: true, streakFreezes: true },
  });

  const isExpired = user?.planExpiresAt && user.planExpiresAt < new Date();
  const activePlan = (!isExpired && user?.plan === "PREMIUM") ? "PREMIUM" : "FREE";

  return NextResponse.json({
    plan: activePlan,
    expiresAt: user?.planExpiresAt,
    streakFreezes: user?.streakFreezes || 0,
    tiers: {
      FREE: TIERS.FREE,
      PREMIUM: TIERS.PREMIUM,
    },
  });
}

// POST: Create Stripe checkout session for premium
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, stripeCustomerId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: "Premium henüz yapılandırılmadı" }, { status: 500 });
  }

  try {
    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://pusulam.ai";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/tr/profil?premium=success`,
      cancel_url: `${baseUrl}/tr/kredi?premium=canceled`,
      metadata: { userId: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe subscription error:", err);
    return NextResponse.json({ error: "Ödeme bağlantısı oluşturulamadı" }, { status: 500 });
  }
}
