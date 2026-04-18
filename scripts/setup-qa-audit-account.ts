import { config as loadDotenv } from 'dotenv';

import { createClerkClient } from '@clerk/backend';

import { createWorkspaceService } from '../lib/server/workspace-service';
import { getDbPool } from '../lib/server/db';
import {
  disableInternalUserByClerkUserId,
  getInternalUserByClerkUserId,
  syncInternalUserFromClerkProfile,
} from '../lib/server/internal-user-sync';

loadDotenv({
  path: '.env.local',
  quiet: true,
});

type Action = 'upsert' | 'disable';
type Role = 'user' | 'admin';

type Options = {
  action: Action;
  assessmentKey: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  verifyPassword: boolean;
};

type Summary = {
  action: Action;
  email: string;
  clerkUserId: string | null;
  clerkStatus: 'created' | 'existing' | 'disabled' | 'not_found';
  internalSync: 'synced' | 'disabled' | 'missing';
  internalUserId: string | null;
  internalRole: Role | null;
  internalStatus: string | null;
  leadershipRouteHref: string | null;
  leadershipRouteUsable: boolean;
  passwordVerified: boolean | null;
};

function parseArgs(argv: readonly string[]): Options {
  let action: Action = 'upsert';
  let assessmentKey = 'leadership';
  let email = '';
  let firstName: string | null = 'QA';
  let lastName: string | null = 'Audit';
  let role: Role = 'user';
  let verifyPassword = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--disable') {
      action = 'disable';
      continue;
    }

    if (arg === '--email' && next) {
      email = next.trim();
      index += 1;
      continue;
    }

    if (arg === '--first-name' && next) {
      firstName = next.trim() || null;
      index += 1;
      continue;
    }

    if (arg === '--last-name' && next) {
      lastName = next.trim() || null;
      index += 1;
      continue;
    }

    if (arg === '--assessment-key' && next) {
      assessmentKey = next.trim();
      index += 1;
      continue;
    }

    if (arg === '--role' && next) {
      if (next !== 'user' && next !== 'admin') {
        throw new Error(`Unsupported role "${next}". Use "user" or "admin".`);
      }

      role = next;
      index += 1;
      continue;
    }

    if (arg === '--skip-password-verify') {
      verifyPassword = false;
      continue;
    }

    throw new Error(`Unsupported argument "${arg}".`);
  }

  if (!email) {
    throw new Error('Missing required argument "--email".');
  }

  return {
    action,
    assessmentKey,
    email,
    firstName,
    lastName,
    role,
    verifyPassword,
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable "${name}".`);
  }

  return value;
}

function getOptionalPassword(): string | null {
  const password = process.env.QA_AUDIT_PASSWORD?.trim() ?? '';
  return password.length > 0 ? password : null;
}

function getClerkClient() {
  return createClerkClient({
    secretKey: getRequiredEnv('CLERK_SECRET_KEY'),
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
}

function getUserDisplayName(firstName: string | null, lastName: string | null): string | null {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return displayName.length > 0 ? displayName : null;
}

async function loadExistingClerkUserByEmail(email: string) {
  const clerkClient = getClerkClient();
  const result = await clerkClient.users.getUserList({
    emailAddress: [email],
    limit: 10,
  });

  return (
    result.data.find((user) =>
      user.emailAddresses.some(
        (emailAddress) => emailAddress.emailAddress.toLowerCase() === email.toLowerCase(),
      ),
    ) ?? null
  );
}

async function ensureClerkUser(options: Options) {
  const clerkClient = getClerkClient();
  const password = getOptionalPassword();
  const existingUser = await loadExistingClerkUserByEmail(options.email);

  if (existingUser) {
    if (password) {
      await clerkClient.users.updateUser(existingUser.id, {
        firstName: options.firstName ?? undefined,
        lastName: options.lastName ?? undefined,
        password,
        skipPasswordChecks: false,
      });
    }

    return {
      user: await clerkClient.users.getUser(existingUser.id),
      clerkStatus: 'existing' as const,
      passwordVerified:
        password && options.verifyPassword
          ? (await clerkClient.users.verifyPassword({
              userId: existingUser.id,
              password,
            }))
              .verified
          : null,
    };
  }

  if (!password) {
    throw new Error(
      'QA_AUDIT_PASSWORD is required when creating a new Clerk QA account.',
    );
  }

  const createdUser = await clerkClient.users.createUser({
    emailAddress: [options.email],
    firstName: options.firstName ?? undefined,
    lastName: options.lastName ?? undefined,
    password,
    privateMetadata: {
      sonartraQaAudit: true,
      purpose: 'live-testing',
    },
  });

  return {
    user: createdUser,
    clerkStatus: 'created' as const,
    passwordVerified:
      options.verifyPassword
        ? (await clerkClient.users.verifyPassword({
            userId: createdUser.id,
            password,
          }))
            .verified
        : null,
  };
}

async function setInternalUserRole(params: {
  clerkUserId: string;
  role: Role;
}): Promise<void> {
  const db = getDbPool();

  await db.query(
    `
    UPDATE users
    SET
      role = $2,
      updated_at = NOW()
    WHERE clerk_user_id = $1
    `,
    [params.clerkUserId, params.role],
  );
}

async function verifyLeadershipRouteUsability(params: {
  internalUserId: string;
  assessmentKey: string;
}): Promise<{ href: string | null; usable: boolean }> {
  const workspace = await createWorkspaceService({
    db: getDbPool(),
  }).getWorkspaceViewModel({
    userId: params.internalUserId,
  });

  const assessment = workspace.assessments.find(
    (item) => item.assessmentKey === params.assessmentKey,
  );

  return {
    href: assessment?.href ?? null,
    usable: assessment !== undefined,
  };
}

async function upsertQaAuditAccount(options: Options): Promise<Summary> {
  const { user, clerkStatus, passwordVerified } = await ensureClerkUser(options);
  const internalUser = await syncInternalUserFromClerkProfile(getDbPool(), user);

  if (internalUser.role !== options.role) {
    await setInternalUserRole({
      clerkUserId: user.id,
      role: options.role,
    });
  }

  const verifiedInternalUser = await getInternalUserByClerkUserId(getDbPool(), user.id);
  if (!verifiedInternalUser) {
    throw new Error(`Internal sync did not produce a row for Clerk user ${user.id}.`);
  }

  const leadershipRoute = await verifyLeadershipRouteUsability({
    internalUserId: verifiedInternalUser.id,
    assessmentKey: options.assessmentKey,
  });

  return {
    action: 'upsert',
    email: options.email,
    clerkUserId: user.id,
    clerkStatus,
    internalSync: 'synced',
    internalUserId: verifiedInternalUser.id,
    internalRole: verifiedInternalUser.role,
    internalStatus: verifiedInternalUser.status,
    leadershipRouteHref: leadershipRoute.href,
    leadershipRouteUsable: leadershipRoute.usable,
    passwordVerified,
  };
}

async function disableQaAuditAccount(options: Options): Promise<Summary> {
  const existingUser = await loadExistingClerkUserByEmail(options.email);

  if (!existingUser) {
    return {
      action: 'disable',
      email: options.email,
      clerkUserId: null,
      clerkStatus: 'not_found',
      internalSync: 'missing',
      internalUserId: null,
      internalRole: null,
      internalStatus: null,
      leadershipRouteHref: null,
      leadershipRouteUsable: false,
      passwordVerified: null,
    };
  }

  const clerkClient = getClerkClient();
  await clerkClient.users.lockUser(existingUser.id);

  const internalUser = await disableInternalUserByClerkUserId(getDbPool(), existingUser.id);

  return {
    action: 'disable',
    email: options.email,
    clerkUserId: existingUser.id,
    clerkStatus: 'disabled',
    internalSync: 'disabled',
    internalUserId: internalUser.id,
    internalRole: internalUser.role,
    internalStatus: internalUser.status,
    leadershipRouteHref: null,
    leadershipRouteUsable: false,
    passwordVerified: null,
  };
}

async function main() {
  getRequiredEnv('DATABASE_URL');

  const options = parseArgs(process.argv.slice(2));
  const summary =
    options.action === 'disable'
      ? await disableQaAuditAccount(options)
      : await upsertQaAuditAccount(options);

  const displayName = getUserDisplayName(options.firstName, options.lastName);

  console.log(
    JSON.stringify(
      {
        ...summary,
        displayName,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
        details:
          typeof error === 'object' && error !== null && 'errors' in error
            ? (error as { errors?: unknown }).errors
            : null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
