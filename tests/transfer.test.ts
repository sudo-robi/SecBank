import { describe, it, expect } from "vitest";
import { transferFunds } from "../src/services/transaction";
import { prisma } from "../src/lib/prisma";

describe("Transfer Service", () => {
  let sourceAccountId: string;
  let destAccountId: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `transfer-test-${Date.now()}@test.com`, passwordHash: "x", name: "Tester" },
    });
    userId = user.id;

    const src = await prisma.account.create({
      data: { userId: user.id, balance: 500, currency: "USD" },
    });
    sourceAccountId = src.id;

    const dst = await prisma.account.create({
      data: { userId: user.id, balance: 100, currency: "USD" },
    });
    destAccountId = dst.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { initiatedById: userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("transfers funds between accounts", async () => {
    const tx = await transferFunds(sourceAccountId, destAccountId, 100, userId, "test transfer");
    expect(tx.status).toBe("COMPLETED");
    expect(tx.description).toBe("test transfer");
  });

  it("updates balances correctly", async () => {
    const src = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    const dst = await prisma.account.findUnique({ where: { id: destAccountId } });
    expect(src!.balance.toNumber()).toBe(400);
    expect(dst!.balance.toNumber()).toBe(200);
  });

  it("rejects insufficient funds", async () => {
    await expect(
      transferFunds(sourceAccountId, destAccountId, 99999, userId),
    ).rejects.toThrow("Insufficient balance");
  });

  it("prevents double-spend under concurrent requests", async () => {
    const acct = await prisma.account.create({
      data: { userId, balance: 100, currency: "USD" },
    });
    const otherAcct = await prisma.account.create({
      data: { userId, balance: 0, currency: "USD" },
    });

    const promises = Array.from({ length: 5 }, () =>
      transferFunds(acct.id, otherAcct.id, 50, userId)
        .then(() => "ok")
        .catch(() => "fail"),
    );

    const results = await Promise.all(promises);
    const succeeded = results.filter((r) => r === "ok");

    expect(succeeded.length).toBe(2);

    const final = await prisma.account.findUnique({ where: { id: acct.id } });
    expect(final!.balance.toNumber()).toBe(0);
  });
});
