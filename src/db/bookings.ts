import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { bookings, teacherProfiles } from './schema.ts';
import type { Booking } from '../types/booking.ts';

/**
 * Fetch all bookings from Cloud SQL PostgreSQL
 */
export async function getAllBookings(): Promise<Booking[]> {
  try {
    const records = await db
      .select()
      .from(bookings)
      .orderBy(desc(bookings.createdAt));

    return records.map((r) => ({
      id: r.id,
      groupId: r.groupId || undefined,
      resourceId: r.resourceId,
      resourceName: r.resourceName,
      resourceType: r.resourceType,
      date: r.date,
      turno: r.turno,
      schedule: r.schedule,
      classrooms: r.classrooms,
      classroom: r.classroom || undefined,
      aulas: r.aulas,
      teacherName: r.teacherName,
      curriculumComponent: r.curriculumComponent,
      notes: r.notes || undefined,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Failed to query bookings from database:', error);
    throw new Error('Database query for bookings failed.', { cause: error });
  }
}

/**
 * Insert a batch of bookings into PostgreSQL in Cloud SQL
 */
export async function insertBatchBookings(
  items: Booking[],
  userId?: string
): Promise<Booking[]> {
  if (items.length === 0) return [];
  try {
    const toInsert = items.map((b) => ({
      id: b.id,
      groupId: b.groupId || null,
      resourceId: b.resourceId,
      resourceName: b.resourceName,
      resourceType: b.resourceType,
      date: b.date,
      turno: b.turno,
      schedule: b.schedule,
      classrooms: b.classrooms,
      classroom: b.classroom || null,
      aulas: b.aulas,
      teacherName: b.teacherName,
      curriculumComponent: b.curriculumComponent,
      notes: b.notes || null,
      createdAt: b.createdAt,
      userId: userId || null,
    }));

    await db.insert(bookings).values(toInsert);
    return items;
  } catch (error) {
    console.error('Failed to insert batch bookings into database:', error);
    throw new Error('Database insert for bookings failed.', { cause: error });
  }
}

/**
 * Delete a booking by ID
 */
export async function deleteBookingById(id: string): Promise<boolean> {
  try {
    const res = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    return res.length > 0;
  } catch (error) {
    console.error('Failed to delete booking from database:', error);
    throw new Error('Database delete for booking failed.', { cause: error });
  }
}

/**
 * Fetch all saved teacher profiles
 */
export async function getTeacherProfiles() {
  try {
    return await db.select().from(teacherProfiles).orderBy(desc(teacherProfiles.updatedAt));
  } catch (error) {
    console.error('Failed to query teacher profiles:', error);
    return [];
  }
}

/**
 * Save or update teacher profile
 */
export async function saveTeacherProfileRecord(name: string, component: string) {
  try {
    await db
      .insert(teacherProfiles)
      .values({
        name,
        component,
      });
  } catch (error) {
    console.error('Failed to save teacher profile:', error);
  }
}
