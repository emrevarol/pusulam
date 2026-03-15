import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isValidEmail,
  validatePassword,
  validateLength,
  sanitizeText,
} from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(request);
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { email, username, displayName, password, referralCode, country } = body;

  if (!email || !username || !displayName || !password) {
    return NextResponse.json(
      { error: "Tüm alanlar zorunludur." },
      { status: 400 }
    );
  }

  // Email validation
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta adresi giriniz." },
      { status: 400 }
    );
  }

  // Username validation
  const usernameErr = validateLength(username, "Kullanıcı adı", 3, 32);
  if (usernameErr) {
    return NextResponse.json({ error: usernameErr }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return NextResponse.json(
      { error: "Kullanıcı adı sadece harf, rakam, _ ve - içerebilir." },
      { status: 400 }
    );
  }

  // Display name validation
  const displayNameErr = validateLength(displayName, "Görünen ad", 2, 64);
  if (displayNameErr) {
    return NextResponse.json({ error: displayNameErr }, { status: 400 });
  }

  // Password validation
  const passwordErr = validatePassword(password);
  if (passwordErr) {
    return NextResponse.json({ error: passwordErr }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta veya kullanıcı adı zaten kullanılıyor." },
      { status: 409 }
    );
  }

  // Look up referrer if referral code provided
  let referredById: string | undefined;
  if (referralCode && typeof referralCode === "string" && referralCode.length <= 20) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (referrer) {
      referredById = referrer.id;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = randomBytes(4).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      username: sanitizeText(username),
      displayName: sanitizeText(displayName),
      passwordHash,
      referralCode: newReferralCode,
      country: ["TR", "DE", "FR", "BR", "GB", "ES", "EG"].includes(country) ? country : "TR",
      ...(referredById ? { referredById } : {}),
    },
  });

  audit({ action: "AUTH_REGISTER", userId: user.id, ip, details: { email } });

  return NextResponse.json(
    { id: user.id, email: user.email, username: user.username },
    { status: 201 }
  );
}
