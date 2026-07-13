import "dotenv/config";
import { prisma } from "../src/lib/prisma";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://secbank:secbank_pass@localhost:5432/secbank_test?schema=public";
process.env.JWT_SECRET = "test-secret-that-is-at-least-thirty-two-characters!!";
process.env.NODE_ENV = "test";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
