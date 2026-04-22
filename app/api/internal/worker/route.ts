import { NextRequest } from 'next/server';
import { processNextJob } from '@/server/services/queue/worker';

export async function POST(request: NextRequest): Promise<Response> {
  // Simple auth check — internal endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const processed = await processNextJob();
  return Response.json({ processed });
}
