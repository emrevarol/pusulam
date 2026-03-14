import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  // Lazy generate referral code if missing
  let code = user?.referralCode;
  if (!code) {
    code = randomBytes(4).toString("hex");
    await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: code },
    });
  }

  const [referralCount, rewards] = await Promise.all([
    prisma.user.count({ where: { referredById: session.user.id } }),
    prisma.referralReward.findMany({
      where: { referrerId: session.user.id },
      select: { amount: true },
    }),
  ]);

  const totalBonus = rewards.reduce((sum, r) => sum + r.amount, 0);

  return NextResponse.json({
    referralCode: code,
    referralCount,
    qualifiedCount: rewards.length,
    totalBonus,
  });
}
