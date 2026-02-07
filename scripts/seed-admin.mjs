/**
 * Seed script to create the initial admin user.
 * Run once after first deployment: npm run db:seed
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment variables or .env file.
 */

import { config } from "dotenv";
config();

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required."
  );
  console.error("Set them in your .env file or pass them directly:");
  console.error(
    '  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret npm run db:seed'
  );
  process.exit(1);
}

async function seedAdmin() {
  // Use Better Auth's sign-up endpoint directly (bypasses disableSignUp)
  const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Admin",
      email,
      password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Failed to create admin user (${response.status}): ${body}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log(`Admin user created successfully: ${data.user?.email || email}`);
}

seedAdmin().catch((err) => {
  console.error("Error seeding admin user:", err.message);
  process.exit(1);
});
