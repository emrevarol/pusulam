import { prisma } from "@/lib/db";
import { notifyBadgeEarned } from "@/lib/notifications";

// Badge definitions — seeded on first check
const BADGE_DEFS = [
  // Trade milestones
  {
    name: "İlk Tahmin",
    description: "İlk tahmininizi yaptınız",
    icon: "🎯",
    tier: "BRONZE",
    requirement: JSON.stringify({ type: "trade_count", value: 1 }),
  },
  {
    name: "Aktif Tahminci",
    description: "10 tahmin yaptınız",
    icon: "📊",
    tier: "SILVER",
    requirement: JSON.stringify({ type: "trade_count", value: 10 }),
  },
  {
    name: "Deneyimli Tahminci",
    description: "50 tahmin yaptınız",
    icon: "🏆",
    tier: "GOLD",
    requirement: JSON.stringify({ type: "trade_count", value: 50 }),
  },
  {
    name: "Usta Tahminci",
    description: "200 tahmin yaptınız",
    icon: "👑",
    tier: "PLATINUM",
    requirement: JSON.stringify({ type: "trade_count", value: 200 }),
  },
  // Streak milestones
  {
    name: "3 Gün Serisi",
    description: "3 gün üst üste tahmin yaptınız",
    icon: "🔥",
    tier: "BRONZE",
    requirement: JSON.stringify({ type: "streak", value: 3 }),
  },
  {
    name: "Haftalık Seri",
    description: "7 gün üst üste tahmin yaptınız",
    icon: "🔥",
    tier: "SILVER",
    requirement: JSON.stringify({ type: "streak", value: 7 }),
  },
  {
    name: "Aylık Seri",
    description: "30 gün üst üste tahmin yaptınız",
    icon: "🔥",
    tier: "GOLD",
    requirement: JSON.stringify({ type: "streak", value: 30 }),
  },
  // Social milestones
  {
    name: "Sosyal Kelebek",
    description: "5 arkadaş edininiz",
    icon: "🦋",
    tier: "BRONZE",
    requirement: JSON.stringify({ type: "friend_count", value: 5 }),
  },
  {
    name: "Topluluk Lideri",
    description: "20 arkadaş edininiz",
    icon: "🌟",
    tier: "SILVER",
    requirement: JSON.stringify({ type: "friend_count", value: 20 }),
  },
  // Comment milestones
  {
    name: "İlk Yorum",
    description: "İlk yorumunuzu yaptınız",
    icon: "💬",
    tier: "BRONZE",
    requirement: JSON.stringify({ type: "comment_count", value: 1 }),
  },
  {
    name: "Tartışmacı",
    description: "25 yorum yaptınız",
    icon: "🗣️",
    tier: "SILVER",
    requirement: JSON.stringify({ type: "comment_count", value: 25 }),
  },
  // Reputation
  {
    name: "İyi Kalibrasyon",
    description: "Reputation skoru 50'yi aştı",
    icon: "📈",
    tier: "SILVER",
    requirement: JSON.stringify({ type: "reputation", value: 50 }),
  },
  {
    name: "Uzman Kalibrasyon",
    description: "Reputation skoru 200'ü aştı",
    icon: "🎖️",
    tier: "GOLD",
    requirement: JSON.stringify({ type: "reputation", value: 200 }),
  },
  // Referral
  {
    name: "Davetçi",
    description: "3 kişiyi platforma davet ettiniz",
    icon: "📨",
    tier: "BRONZE",
    requirement: JSON.stringify({ type: "referral_count", value: 3 }),
  },
] as const;

async function ensureBadgesSeeded() {
  const count = await prisma.badge.count();
  if (count >= BADGE_DEFS.length) return;

  for (const def of BADGE_DEFS) {
    await prisma.badge.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
  }
}

/**
 * Check and award badges for a user. Call after trades, comments, friend accepts, etc.
 */
export async function checkAndAwardBadges(userId: string) {
  await ensureBadgesSeeded();

  const [user, tradeCount, commentCount, friendCount, referralCount, existingBadges] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, reputation: true },
      }),
      prisma.trade.count({ where: { userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: userId }, { receiverId: userId }],
        },
      }),
      prisma.user.count({ where: { referredById: userId } }),
      prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
    ]);

  if (!user) return;

  const earnedBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

  const allBadges = await prisma.badge.findMany();
  const newBadges: string[] = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    const req = JSON.parse(badge.requirement) as { type: string; value: number };
    let qualifies = false;

    switch (req.type) {
      case "trade_count":
        qualifies = tradeCount >= req.value;
        break;
      case "streak":
        qualifies = user.streak >= req.value;
        break;
      case "friend_count":
        qualifies = friendCount >= req.value;
        break;
      case "comment_count":
        qualifies = commentCount >= req.value;
        break;
      case "reputation":
        qualifies = user.reputation >= req.value;
        break;
      case "referral_count":
        qualifies = referralCount >= req.value;
        break;
    }

    if (qualifies) {
      // Use upsert to prevent duplicate badge awards from concurrent requests
      const result = await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        update: {},
        create: { userId, badgeId: badge.id },
      });
      // Only notify if badge was just created (not already existing)
      const isNew = result.earnedAt.getTime() > Date.now() - 5000;
      if (isNew) {
        newBadges.push(badge.id);
        await notifyBadgeEarned(userId, badge.name, badge.icon).catch(() => {});
      }
    }
  }

  return newBadges;
}
