import { prisma } from "@/lib/db";
import {
  sendEmail,
  friendRequestEmail,
  friendAcceptedEmail,
  marketResolvedEmail,
  payoutEmail,
  badgeEarnedEmail,
} from "@/lib/email";

type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "MARKET_RESOLVED"
  | "COMMENT_REPLY"
  | "BADGE_EARNED"
  | "PAYOUT";

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email || null;
}

async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, body, link },
  });
}

export async function notifyFriendRequest(
  receiverId: string,
  senderName: string
) {
  await createNotification(
    receiverId,
    "FRIEND_REQUEST",
    "Yeni Arkadaşlık İsteği",
    `${senderName} sana arkadaşlık isteği gönderdi.`,
    "/arkadaslar"
  );

  const email = await getUserEmail(receiverId);
  if (email) {
    const { subject, html } = friendRequestEmail(senderName);
    sendEmail({ to: email, subject, html }).catch(() => {});
  }
}

export async function notifyFriendAccepted(
  requesterId: string,
  accepterName: string
) {
  await createNotification(
    requesterId,
    "FRIEND_ACCEPTED",
    "Arkadaşlık Kabul Edildi",
    `${accepterName} arkadaşlık isteğini kabul etti.`,
    "/arkadaslar"
  );

  const email = await getUserEmail(requesterId);
  if (email) {
    const { subject, html } = friendAcceptedEmail(accepterName);
    sendEmail({ to: email, subject, html }).catch(() => {});
  }
}

export async function notifyMarketResolved(
  userId: string,
  marketTitle: string,
  outcome: string,
  slug: string
) {
  await createNotification(
    userId,
    "MARKET_RESOLVED",
    "Piyasa Sonuçlandı",
    `"${marketTitle}" piyasası ${outcome} olarak sonuçlandı.`,
    `/piyasalar/${slug}`
  );

  const email = await getUserEmail(userId);
  if (email) {
    const { subject, html } = marketResolvedEmail(marketTitle, outcome, slug);
    sendEmail({ to: email, subject, html }).catch(() => {});
  }
}

export async function notifyPayout(
  userId: string,
  marketTitle: string,
  amount: number,
  slug: string
) {
  await createNotification(
    userId,
    "PAYOUT",
    "Ödeme Alındı",
    `"${marketTitle}" piyasasından ${amount} Oy Hakkı kazandın!`,
    `/piyasalar/${slug}`
  );

  const email = await getUserEmail(userId);
  if (email) {
    const { subject, html } = payoutEmail(marketTitle, amount, slug);
    sendEmail({ to: email, subject, html }).catch(() => {});
  }
}

export async function notifyBadgeEarned(
  userId: string,
  badgeName: string,
  badgeIcon: string,
  reward: number = 0
) {
  const rewardText = reward > 0 ? ` +${reward} Oy Hakkı kazandın!` : "";
  await createNotification(
    userId,
    "BADGE_EARNED",
    "Yeni Rozet Kazandın!",
    `${badgeIcon} ${badgeName} rozetini kazandın!${rewardText}`,
    "/profil"
  );

  const email = await getUserEmail(userId);
  if (email) {
    const { subject, html } = badgeEarnedEmail(badgeName, badgeIcon, reward);
    sendEmail({ to: email, subject, html }).catch(() => {});
  }
}
