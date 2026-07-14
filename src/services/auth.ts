import { prisma } from "../lib/prisma";
import type { JwtPayload } from "../types";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, signRefreshToken, hashToken, verifyToken, signResetToken, verifyResetToken } from "../lib/jwt";
import { UnauthorizedError, ConflictError } from "../lib/errors";

export async function registerUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError("Email already registered");

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return user;
}

export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    await logFailedAttempt(email, "USER_NOT_FOUND", ipAddress, userAgent);
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logFailedAttempt(email, "INVALID_PASSWORD", ipAddress, userAgent);
    throw new UnauthorizedError("Invalid credentials");
  }

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  verifyToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  if (!session.user.isActive) {
    throw new UnauthorizedError("User deactivated");
  }

  const newPayload = { sub: session.user.id, email: session.user.email, role: session.user.role };

  return {
    accessToken: signAccessToken(newPayload),
  };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return a generic message to avoid account enumeration.
  // In production this token would be emailed; this demo returns it so the
  // client can complete the flow without a mail server.
  if (!user) {
    return { message: "If an account exists, a password reset link has been sent." };
  }

  const resetToken = signResetToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    message: "If an account exists, a password reset link has been sent.",
    resetToken,
  };
}

export async function resetPassword(token: string, password: string) {
  let payload: JwtPayload;
  try {
    payload = verifyResetToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: payload.sub },
    data: { passwordHash },
  });

  // Revoke all active sessions so a stolen password can't be reused.
  await prisma.session.updateMany({
    where: { userId: payload.sub, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  return { message: "Password updated successfully." };
}

export async function revokeSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.session.updateMany({
    where: { tokenHash, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

export async function getActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
  });
}

export async function getFailedLoginStats(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [total, byEmail, byIp, hourly] = await Promise.all([
    prisma.failedLoginAttempt.count({ where: { createdAt: { gte: since } } }),
    prisma.failedLoginAttempt.groupBy({
      by: ["email"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { email: "desc" } },
      take: 10,
    }),
    prisma.failedLoginAttempt.groupBy({
      by: ["ipAddress"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { ipAddress: "desc" } },
      take: 10,
    }),
    getHourlyFailedLogins(since),
  ]);

  return { total, byEmail, byIp, hourly };
}

async function getHourlyFailedLogins(since: Date) {
  const attempts = await prisma.failedLoginAttempt.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const hourly: Record<string, number> = {};
  for (const a of attempts) {
    const key = a.createdAt.toISOString().slice(0, 13) + ":00";
    hourly[key] = (hourly[key] || 0) + 1;
  }
  return Object.entries(hourly).map(([hour, count]) => ({ hour, count }));
}

async function logFailedAttempt(
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
) {
  await prisma.failedLoginAttempt.create({
    data: { email, ipAddress: ipAddress ?? "unknown", userAgent, reason },
  });
}

export async function getSuspiciousActivity(hours = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [rapidTransfers, bruteForceIps, bruteForceEmails] = await Promise.all([
    // More than 5 transfers in 1 minute from same user
    prisma.$queryRawUnsafe<Array<{ initiatedById: string; cnt: string }>>(`
      SELECT "initiatedById", COUNT(*)::text as cnt
      FROM "Transaction"
      WHERE "createdAt" >= $1
      GROUP BY "initiatedById"
      HAVING COUNT(*) > 5
    `, since),
    // More than 10 failed attempts from same IP in timeframe
    prisma.failedLoginAttempt.groupBy({
      by: ["ipAddress"],
      where: { createdAt: { gte: since } },
      _count: true,
      having: { ipAddress: { _count: { gt: 10 } } },
    }),
    // More than 5 failed attempts on same email
    prisma.failedLoginAttempt.groupBy({
      by: ["email"],
      where: { createdAt: { gte: since } },
      _count: true,
      having: { email: { _count: { gt: 5 } } },
    }),
  ]);

  return {
    rapidTransfers: rapidTransfers.map((r) => ({
      type: "RAPID_TRANSFERS",
      userId: r.initiatedById,
      count: parseInt(r.cnt),
      detail: `User initiated ${r.cnt} transfers in under an hour`,
    })),
    bruteForceIps: bruteForceIps.map((b) => ({
      type: "BRUTE_FORCE_IP",
      ip: b.ipAddress,
      count: b._count,
      detail: `${b._count} failed logins from ${b.ipAddress}`,
    })),
    bruteForceEmails: bruteForceEmails.map((b) => ({
      type: "BRUTE_FORCE_EMAIL",
      email: b.email,
      count: b._count,
      detail: `${b._count} failed logins for ${b.email}`,
    })),
  };
}
