import { google } from 'googleapis';
import { prisma } from './prisma';
import type { CalendarSync } from '@prisma/client';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export class CalendarService {
  private oauth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  async listCalendars() {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  }

  async syncCalendar(userId: string, calendarSync: CalendarSync): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Calculate time range: 30 days back, 90 days forward
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const response = await calendar.events.list({
        calendarId: calendarSync.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        syncToken: calendarSync.syncToken || undefined
      });

      const events = response.data.items || [];

      for (const event of events) {
        if (!event.id || !event.start || event.status === 'cancelled') {
          if (event.id && event.status === 'cancelled') {
            // Delete cancelled events
            await prisma.calendarEvent.deleteMany({
              where: {
                calendarSyncId: calendarSync.id,
                externalId: event.id
              }
            });
            result.deleted++;
          }
          continue;
        }

        const startTime = event.start.dateTime || event.start.date;
        const endTime = event.end?.dateTime || event.end?.date;

        if (!startTime || !endTime) continue;

        const existingEvent = await prisma.calendarEvent.findUnique({
          where: {
            calendarSyncId_externalId: {
              calendarSyncId: calendarSync.id,
              externalId: event.id
            }
          }
        });

        const eventData = {
          userId,
          externalId: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          isAllDay: !event.start.dateTime
        };

        if (existingEvent) {
          await prisma.calendarEvent.update({
            where: { id: existingEvent.id },
            data: eventData
          });
          result.updated++;
        } else {
          await prisma.calendarEvent.create({
            data: {
              ...eventData,
              calendarSyncId: calendarSync.id
            }
          });
          result.created++;
        }
        result.synced++;
      }

      // Update sync status
      await prisma.calendarSync.update({
        where: { id: calendarSync.id },
        data: {
          lastSyncAt: new Date(),
          nextSyncAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          syncToken: response.data.nextSyncToken || null
        }
      });

    } catch (error) {
      console.error('Calendar sync error:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  async createEvent(calendarId: string, event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
  }) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const eventData: any = {
      summary: event.title,
      description: event.description,
      start: event.isAllDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.isAllDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() }
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData
    });

    return response.data;
  }

  async findAvailableSlots(
    calendarId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    workingHours = { start: 9, end: 17 }
  ): Promise<Array<{ start: Date; end: Date }>> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    const slots: Array<{ start: Date; end: Date }> = [];

    // Simple slot finding: check each day
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(workingHours.start, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(workingHours.end, 0, 0, 0);

      // Find busy times for this day
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        return eventStart >= dayStart && eventStart < dayEnd;
      });

      // Find gaps
      let searchTime = new Date(dayStart);
      for (const event of dayEvents) {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');

        const gapMinutes = (eventStart.getTime() - searchTime.getTime()) / (1000 * 60);
        if (gapMinutes >= durationMinutes) {
          slots.push({
            start: new Date(searchTime),
            end: new Date(searchTime.getTime() + durationMinutes * 60 * 1000)
          });
        }
        searchTime = new Date(Math.max(searchTime.getTime(), eventEnd.getTime()));
      }

      // Check remaining time in day
      const remainingMinutes = (dayEnd.getTime() - searchTime.getTime()) / (1000 * 60);
      if (remainingMinutes >= durationMinutes) {
        slots.push({
          start: new Date(searchTime),
          end: new Date(searchTime.getTime() + durationMinutes * 60 * 1000)
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots.slice(0, 10); // Return top 10 slots
  }
}

export async function syncUserCalendars(userId: string, accessToken: string, refreshToken?: string): Promise<SyncResult> {
  const service = new CalendarService(accessToken, refreshToken);

  const syncs = await prisma.calendarSync.findMany({
    where: { userId, syncEnabled: true }
  });

  const results: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    errors: []
  };

  for (const sync of syncs) {
    const syncResult = await service.syncCalendar(userId, sync);
    results.synced += syncResult.synced;
    results.created += syncResult.created;
    results.updated += syncResult.updated;
    results.deleted += syncResult.deleted;
    results.errors.push(...syncResult.errors);
  }

  return results;
}
