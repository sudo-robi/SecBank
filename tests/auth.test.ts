import { describe, it, expect } from "vitest";
import { registerUser, loginUser } from "../src/services/auth";
import { prisma } from "../src/lib/prisma";

describe("Auth Service", () => {
  const testEmail = `test-${Date.now()}@test.com`;

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: testEmail }, select: { id: true } });
    const userIds = users.map(u => u.id);
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it("registers a new user", async () => {
    const user = await registerUser(testEmail, "password123", "Test User");
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe("Test User");
    expect(user.role).toBe("USER");
  });

  it("rejects duplicate email", async () => {
    await expect(
      registerUser(testEmail, "password123", "Another"),
    ).rejects.toThrow("Email already registered");
  });

  it("logs in with valid credentials", async () => {
    const result = await loginUser(testEmail, "password123");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe(testEmail);
  });

  it("rejects invalid password", async () => {
    await expect(
      loginUser(testEmail, "wrongpassword"),
    ).rejects.toThrow("Invalid credentials");
  });
});
