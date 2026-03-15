import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { rateLimit } from "./rate-limit";
import { audit } from "./audit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Sifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Account lockout: 10 failed attempts per email per 15 minutes
        const lockoutCheck = rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        if (!lockoutCheck.success) {
          audit({
            action: "AUTH_LOCKOUT",
            details: { email, reason: "Too many failed attempts" },
          });
          throw new Error("Cok fazla basarisiz giris denemesi. 15 dakika bekleyin.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          audit({ action: "AUTH_LOGIN_FAILED", details: { email, reason: "User not found" } });
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          audit({ action: "AUTH_LOGIN_FAILED", userId: user.id, details: { email } });
          return null;
        }

        audit({ action: "AUTH_LOGIN_SUCCESS", userId: user.id });

        // Update last active
        prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        }).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/giris",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as unknown as { username: string }).username;
        token.role = (user as unknown as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { username: string }).username = token.username as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
