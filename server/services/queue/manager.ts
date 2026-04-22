import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '../../db/connection';
import { jobs } from '../../db/schema';
import type { Job } from '../../db/schema';
import type { CreateJobParams, ExecutionLogEntry } from './types';

export async function createJob(params: CreateJobParams): Promise<Job> {
  const [job] = await db.insert(jobs).values({
    clinicId: params.clinicId,
    jobType: params.jobType,
    status: 'queued',
    priority: params.priority ?? 5,
    triggeredBy: params.triggeredBy,
    triggerSource: params.triggerSource ?? 'manual',
    totalItems: params.totalItems,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
    executionLog: [],
  }).returning();

  return job;
}

export async function getNextJob(): Promise<Job | null> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'queued'))
    .orderBy(asc(jobs.priority), asc(jobs.createdAt))
    .limit(1);

  return job ?? null;
}

export async function updateJobStatus(
  jobId: string,
  status: string,
  updates?: Partial<{
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
    processedItems: number;
    failedItems: number;
    result: unknown;
    errorMessage: string;
  }>,
): Promise<void> {
  await db
    .update(jobs)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

export async function appendToExecutionLog(
  jobId: string,
  entry: ExecutionLogEntry,
): Promise<void> {
  await db
    .update(jobs)
    .set({
      executionLog: sql`COALESCE(${jobs.executionLog}, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

export async function cancelJob(jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(jobs.id, jobId),
        sql`${jobs.status} IN ('queued', 'running')`,
      ),
    );
}

export async function retryJob(jobId: string): Promise<Job> {
  const [original] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!original) throw new Error('Job not found');

  const [newJob] = await db.insert(jobs).values({
    clinicId: original.clinicId,
    jobType: original.jobType,
    status: 'queued',
    priority: original.priority,
    triggeredBy: original.triggeredBy,
    triggerSource: 'retry',
    totalItems: original.totalItems,
    relatedEntityType: original.relatedEntityType,
    relatedEntityId: original.relatedEntityId,
    executionLog: [],
    retryCount: (original.retryCount ?? 0) + 1,
    maxRetries: original.maxRetries,
  }).returning();

  return newJob;
}

export async function getJobById(jobId: string): Promise<Job | null> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  return job ?? null;
}

export async function getJobsByClinic(
  clinicId: string | null,
  filters?: {
    status?: string;
    jobType?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ items: Job[]; total: number }> {
  const conditions = [];
  if (clinicId) conditions.push(eq(jobs.clinicId, clinicId));
  if (filters?.status) conditions.push(eq(jobs.status, filters.status));
  if (filters?.jobType) conditions.push(eq(jobs.jobType, filters.jobType));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(where);

  const items = await db
    .select()
    .from(jobs)
    .where(where)
    .orderBy(asc(jobs.priority), asc(jobs.createdAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return { items, total: Number(countResult?.count ?? 0) };
}
