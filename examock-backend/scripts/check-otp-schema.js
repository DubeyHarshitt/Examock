#!/usr/bin/env node
// Fails the deploy when the database is missing a column the OTP flow writes to.
//
// WHY THIS EXISTS:
// `prisma migrate deploy` compares the migrations/ folder against Postgres's
// _prisma_migrations table. A schema.prisma that has drifted AHEAD of that
// folder — edited by hand, with no `migrate dev` run to generate a migration —
// looks perfectly healthy to it. So the deploy goes green while the running app
// dies on an unknown column.
//
// That is exactly what happened with commit d1f32cb: it added
// users.emailVerified, otp_records.email, and made otp_records.mobile nullable,
// but shipped no migration. Every OTP send then failed at the INSERT, after
// generateOtp() had already logged the code — so the logs looked healthy and no
// email was ever sent.
//
// This asserts the columns the code actually depends on and fails loudly, which
// catches the whole class of drift rather than one instance of it.
//
// Uses DIRECT_URL (session-mode Postgres). DATABASE_URL is a transaction pooler
// (pgbouncer), which works for app queries but is not guaranteed to answer
// information_schema promptly.
//
// Usage: node scripts/check-otp-schema.js   (exit 0 = fine, exit 1 = broken)

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

// mustBeNullable marks columns the OTP insert omits. If Postgres still has
// them NOT NULL, the insert fails on a not-null violation even though the
// column exists and the schema says it is optional.
const REQUIRED = [
  { table: "users", column: "email_verified" },
  { table: "users", column: "mobile_verified" },
  { table: "otp_records", column: "email" },
  { table: "otp_records", column: "mobile", mustBeNullable: true },
  { table: "otp_records", column: "verified" },
  { table: "otp_records", column: "expires_at" },
];

// Static string, no interpolation — information_schema cannot be parameterised.
const ROWS = `
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (table_name, column_name) IN (
      ('users','email_verified'), ('users','mobile_verified'),
      ('otp_records','email'), ('otp_records','mobile'),
      ('otp_records','verified'), ('otp_records','expires_at')
    )
`;

const problems = [];
let existing;

try {
  existing = await prisma.$queryRawUnsafe(ROWS);
} catch (err) {
  console.error(
    `✖ Could not inspect the database: ${err.message}\n` +
      "  Check DIRECT_URL in .env and that the host can reach Postgres.",
  );
  await prisma.$disconnect();
  process.exit(1);
}

const found = new Map(
  existing.map((r) => [`${r.table_name}.${r.column_name}`, r.is_nullable === "YES"]),
);

for (const { table, column, mustBeNullable } of REQUIRED) {
  const key = `${table}.${column}`;
  if (!found.has(key)) {
    problems.push(`${key} does not exist`);
  } else if (mustBeNullable && !found.get(key)) {
    problems.push(`${key} is still NOT NULL, but the email OTP insert omits it`);
  }
}

await prisma.$disconnect();

if (problems.length) {
  console.error(
    "✖ Schema is behind schema.prisma — the OTP flow would fail at runtime:\n" +
      problems.map((p) => `    - ${p}`).join("\n") +
      "\n\n  schema.prisma was changed without a matching migration. Generate one:\n" +
      "    npx prisma migrate dev --name <descriptive_name>\n" +
      "  commit the generated migration, then re-run this deploy.",
  );
  process.exit(1);
}

console.log("✔ OTP schema check passed (email/otp_records columns present and nullable where required)");
