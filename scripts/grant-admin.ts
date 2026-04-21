import { config as loadDotenv } from 'dotenv';

import { Pool } from 'pg';

loadDotenv({
  path: '.env.local',
  quiet: true,
});

type InternalUserRow = {
  id: string;
  clerk_user_id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'invited' | 'disabled';
};

type Options = {
  email: string;
};

function parseArgs(argv: readonly string[]): Options {
  let email = 'qa-user@sonartra.local';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--email' && next) {
      email = next.trim();
      index += 1;
      continue;
    }

    throw new Error(`Unsupported argument "${arg}".`);
  }

  if (!email) {
    throw new Error('Email is required.');
  }

  return { email };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable "${name}".`);
  }

  return value;
}

function assertSafeEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to grant admin access from this script in production.');
  }
}

async function main() {
  assertSafeEnvironment();

  const options = parseArgs(process.argv.slice(2));
  const pool = new Pool({
    connectionString: getRequiredEnv('DATABASE_URL'),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const existing = await pool.query<InternalUserRow>(
      `
      SELECT
        id::text AS id,
        clerk_user_id,
        email,
        role,
        status
      FROM users
      WHERE lower(email) = lower($1)
      ORDER BY created_at ASC, id ASC
      `,
      [options.email],
    );

    if (existing.rows.length === 0) {
      throw new Error(
        `No internal user record found for ${options.email}. Sign in once first so the Clerk user sync creates the users row, then rerun this script.`,
      );
    }

    if (existing.rows.length > 1) {
      throw new Error(
        `Found ${existing.rows.length} internal user rows for ${options.email}. Resolve the duplicate records before granting admin.`,
      );
    }

    const current = existing.rows[0]!;

    const updated = await pool.query<InternalUserRow>(
      `
      UPDATE users
      SET
        role = 'admin',
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING
        id::text AS id,
        clerk_user_id,
        email,
        role,
        status
      `,
      [current.id],
    );

    const next = updated.rows[0];
    if (!next) {
      throw new Error(`Admin grant update did not return a row for ${options.email}.`);
    }

    console.log(
      JSON.stringify(
        {
          roleModel: 'users.role',
          updated: current.role !== next.role,
          before: current,
          after: next,
          note:
            'Server-side admin checks read requestUser.userRole from the internal users table. Re-login is only needed for real auth sessions; the current local DEV_USER_BYPASS path reads this row directly.',
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
