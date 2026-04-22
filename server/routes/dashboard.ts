import { NextRequest } from 'next/server';
import { eq, and, sql, gte } from 'drizzle-orm';
import { db } from '../db/connection';
import { clinics, patientsCache, insuranceCache, jobs, notifications } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth } from '../middleware/auth';
import { withAudit } from '../middleware/audit';

export const getDashboardKPIs = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_dashboard', async (_request, context) => {
      const { role, clinicId } = context.user;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (role === 'it_admin') {
        const [clinicCount] = await db.select({ count: sql<number>`count(*)` }).from(clinics);
        const [patientCount] = await db.select({ count: sql<number>`count(*)` }).from(patientsCache);
        const [jobsToday] = await db
          .select({ count: sql<number>`count(*)` })
          .from(jobs)
          .where(gte(jobs.createdAt, todayStart));
        const [failedToday] = await db
          .select({ count: sql<number>`count(*)` })
          .from(jobs)
          .where(and(eq(jobs.status, 'failed'), gte(jobs.createdAt, todayStart)));

        return Response.json({
          data: {
            role: 'it_admin',
            totalClinics: Number(clinicCount?.count ?? 0),
            totalPatients: Number(patientCount?.count ?? 0),
            jobsToday: Number(jobsToday?.count ?? 0),
            failedJobsToday: Number(failedToday?.count ?? 0),
          },
        });
      }

      if (role === 'staff_admin' && clinicId) {
        const [patientCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(patientsCache)
          .where(eq(patientsCache.clinicId, clinicId));

        const [unverifiedCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(insuranceCache)
          .where(
            and(
              eq(insuranceCache.clinicId, clinicId),
              sql`${insuranceCache.verificationStatus} IS NULL OR ${insuranceCache.verificationStatus} = 'stale'`,
            ),
          );

        const [jobsToday] = await db
          .select({ count: sql<number>`count(*)` })
          .from(jobs)
          .where(and(eq(jobs.clinicId, clinicId), gte(jobs.createdAt, todayStart)));

        const [unreadNotifs] = await db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.clinicId, clinicId),
              eq(notifications.isRead, false),
            ),
          );

        return Response.json({
          data: {
            role: 'staff_admin',
            patientCount: Number(patientCount?.count ?? 0),
            unverifiedInsurance: Number(unverifiedCount?.count ?? 0),
            jobsToday: Number(jobsToday?.count ?? 0),
            unreadNotifications: Number(unreadNotifs?.count ?? 0),
          },
        });
      }

      // staff_user
      if (clinicId) {
        const [unreadNotifs] = await db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.clinicId, clinicId),
              eq(notifications.isRead, false),
            ),
          );

        const [jobsCompleted] = await db
          .select({ count: sql<number>`count(*)` })
          .from(jobs)
          .where(
            and(
              eq(jobs.clinicId, clinicId),
              eq(jobs.status, 'completed'),
              gte(jobs.createdAt, todayStart),
            ),
          );

        return Response.json({
          data: {
            role: 'staff_user',
            jobsCompletedToday: Number(jobsCompleted?.count ?? 0),
            unreadNotifications: Number(unreadNotifs?.count ?? 0),
          },
        });
      }

      return Response.json({ data: { role } });
    }),
  ),
);
