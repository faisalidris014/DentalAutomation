import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { clinics, jobs } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { getAdapter } from '../adapters/pms/registry';

export const listAgents = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('list_agents', async (_request, context) => {
      // Get clinics the user can see
      let clinicRows: (typeof clinics.$inferSelect)[] = [];
      if (context.user.role === 'it_admin') {
        clinicRows = await db.select().from(clinics);
      } else if (context.user.clinicId) {
        clinicRows = await db
          .select()
          .from(clinics)
          .where(eq(clinics.id, context.user.clinicId));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const agentData = await Promise.all(
        clinicRows.map(async (clinic) => {
          // Get job queue counts
          const [queuedResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(jobs)
            .where(
              and(
                eq(jobs.clinicId, clinic.id),
                eq(jobs.status, 'queued'),
              ),
            );

          const [completedTodayResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(jobs)
            .where(
              and(
                eq(jobs.clinicId, clinic.id),
                eq(jobs.status, 'completed'),
                sql`${jobs.completedAt} >= ${today.toISOString()}`,
              ),
            );

          // Test PMS connection
          let pmsConnected = false;
          try {
            const adapter = getAdapter(clinic);
            const result = await adapter.testConnection();
            pmsConnected = result.connected;
          } catch {
            pmsConnected = false;
          }

          return {
            id: `agent_${clinic.id}`,
            clinicId: clinic.id,
            clinicName: clinic.name,
            status: pmsConnected ? 'online' : 'offline',
            version: '2.4.1',
            latestVersion: '2.4.1',
            lastHeartbeat: clinic.updatedAt?.toISOString() ?? new Date().toISOString(),
            jobsInQueue: Number(queuedResult?.count ?? 0),
            jobsCompletedToday: Number(completedTodayResult?.count ?? 0),
            openDentalConnected: pmsConnected,
            uptime: pmsConnected ? '—' : '0d 0h',
            logs: [],
          };
        }),
      );

      return Response.json({ data: agentData });
    }),
  ),
);
