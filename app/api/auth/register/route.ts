import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { email, username, displayName, password } = await request.json();

  if (!email || !username || !displayName || !password) {
    return NextResponse.json(
      { error: "Tüm alanlar zorunludur." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Şifre en az 6 karakter olmalıdır." },
      { status: 400 }
    );
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

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, username, displayName, passwordHash },
  });

  return NextResponse.json(
    { id: user.id, email: user.email, username: user.username },
    { status: 201 }
  );
}
