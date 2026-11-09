import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type { AulaRoomAssignment, ItemType, Turno } from '../types/booking.ts';

// Users table (mandatory for Firebase Auth link in Cloud SQL setup)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bookings table storing all equipment, room, and aula assignments
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  groupId: text('group_id'),
  resourceId: text('resource_id').notNull(),
  resourceName: text('resource_name').notNull(),
  resourceType: text('resource_type').$type<ItemType>().notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format
  turno: text('turno').$type<Turno>().notNull(),
  schedule: jsonb('schedule').$type<AulaRoomAssignment[]>().notNull(),
  classrooms: jsonb('classrooms').$type<string[]>().notNull(),
  classroom: text('classroom'),
  aulas: jsonb('aulas').$type<string[]>().notNull(),
  teacherName: text('teacher_name').notNull(),
  curriculumComponent: text('curriculum_component').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  userId: text('user_id'),
});

// Teacher profiles for instant auto-complete shortcuts
export const teacherProfiles = pgTable('teacher_profiles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  component: text('component').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
