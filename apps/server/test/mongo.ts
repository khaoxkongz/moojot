import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { createPrismaClient } from "@moojot/db";
import { MongoMemoryReplSet } from "mongodb-memory-server";

export async function startTestDatabase() {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const url = mongo.getUri(`slip_test_${crypto.randomUUID().replaceAll("-", "")}`);
  try {
    await promisify(execFile)(
      resolve("node_modules/.bin/prisma"),
      ["db", "push", "--schema", resolve("packages/db/prisma/schema"), "--skip-generate"],
      { env: { ...process.env, DATABASE_URL: url } }
    );
  } catch (error) {
    await mongo.stop();
    throw error;
  }
  const db = createPrismaClient({ DATABASE_URL: url });
  return {
    db,
    close: async () => {
      await db.$disconnect();
      await mongo.stop();
    },
  };
}
