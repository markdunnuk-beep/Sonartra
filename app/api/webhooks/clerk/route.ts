import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';

import { getDbPool } from '@/lib/server/db';
import {
  disableInternalUserByClerkUserId,
  syncInternalUserFromClerkProfile,
} from '@/lib/server/internal-user-sync';

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid_webhook';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = getDbPool();

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      await syncInternalUserFromClerkProfile(db, event.data);

      return NextResponse.json(
        {
          received: true,
          type: event.type,
        },
        { status: 200 },
      );
    }

    case 'user.deleted': {
      if (!event.data.id) {
        return NextResponse.json(
          { error: 'deleted Clerk user id is required' },
          { status: 400 },
        );
      }

      await disableInternalUserByClerkUserId(db, event.data.id);

      return NextResponse.json(
        {
          received: true,
          type: event.type,
        },
        { status: 200 },
      );
    }

    default: {
      return NextResponse.json(
        {
          received: true,
          ignored: true,
          type: event.type,
        },
        { status: 200 },
      );
    }
  }
}
