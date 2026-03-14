import { prisma } from "@/lib/db";

type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "MARKET_RESOLVED"
  | "COMMENT_REPLY"
  | "BADGE_EARNED"
  | "PAYOUT";

export async function createNotification(
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
  return createNotification(
    receiverId,
    "FRIEND_REQUEST",
    "Yeni Arkadaşlık İsteği",
    `${senderName} sana arkadaşlık isteği gönderdi.`,
    "/arkadaslar"
  );
}

export async function notifyFriendAccepted(
  requesterId: string,
  accepterName: string
) {
  return createNotification(
    requesterId,
    "FRIEND_ACCEPTED",
    "Arkadaşlık Kabul Edildi",
    `${accepterName} arkadaşlık isteğini kabul etti.`,
    "/arkadaslar"
  );
}

export async function notifyMarketResolved(
  userId: string,
  marketTitle: string,
  outcome: string,
  slug: string
) {
  return createNotification(
    userId,
    "MARKET_RESOLVED",
    "Piyasa Sonuçlandı",
    `"${marketTitle}" piyasası ${outcome} olarak sonuçlandı.`,
    `/piyasalar/${slug}`
  );
}

export async function notifyPayout(
  userId: string,
  marketTitle: string,
  amount: number,
  slug: string
) {
  return createNotification(
    userId,
    "PAYOUT",
    "Ödeme Alındı",
    `"${marketTitle}" piyasasından ${amount} Oy Hakkı kazandın!`,
    `/piyasalar/${slug}`
  );
}

export async function notifyBadgeEarned(
  userId: string,
  badgeName: string,
  badgeIcon: string
) {
  return createNotification(
    userId,
    "BADGE_EARNED",
    "Yeni Rozet Kazandın!",
    `${badgeIcon} ${badgeName} rozetini kazandın!`,
    "/profil"
  );
}
