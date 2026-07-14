import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "../types";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function signResetToken(payload: JwtPayload): string {
  return jwt.sign(
    { ...payload, purpose: "password-reset" },
    env.JWT_SECRET,
    { expiresIn: "1h" } as jwt.SignOptions,
  );
}

export function verifyResetToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
    purpose?: string;
  };
  if (decoded.purpose !== "password-reset") {
    throw new Error("Invalid reset token");
  }
  return decoded;
}
