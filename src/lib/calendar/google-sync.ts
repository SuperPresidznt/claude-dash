import { prisma } from '../prisma';
import { google } from 'googleapis';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export class GoogleCalendarSync {
  private userId: string;
  private accessToken: string;

  constructor(userId: string, accessToken: string) {
    this.userId = userId;
    this.accessToken = accessToken;
  }

  private getCalendarClient() {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: this.accessToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async syncFromGoogle(calendarId: string = 'primary'): Promise<void> {
    try {
      const calendar = this.getCalendarClient();

      // Get or create calendar sync record
      let calendarSync = await prisma.calendarSync.findUnique({
        where: {
          userId_provider_calendarId: {
            userId: this.userId,
            provider: 'google',
            calendarId
          }
        }
      });

      if (!calendarSync) {
        calendarSync = await prisma.calendarSync.create({
          data: {
            userId: this.userId,
            provider: 'google',
            calendarId,
            syncEnabled: true
          }
        });
      }

      // Fetch events from Google Calendar
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await calendar.events.list({
        calendarId,
        timeMin: oneMonthAgo.toISOString(),
        timeMax: oneMonthAhead.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        syncToken: calendarSync.syncToken || undefined
      });

      const events = response.data.items || [];

      // Upsert events to database
      for (const event of events) {
        if (!event.id || !event.start) continue;

        const startTime = event.start.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start.date || '');
        const endTime = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
          ? new Date(event.end.date)
          : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

        await prisma.calendarEvent.upsert({
          where: {
            calendarSyncId_externalId: {
              calendarSyncId: calendarSync.id,
              externalId: event.id
            }
          },
          create: {
            calendarSyncId: calendarSync.id,
            userId: this.userId,
            externalId: event.id,
            title: event.summary || 'Untitled Event',
            description: event.description,
            startTime,
            endTime,
            isAllDay: Boolean(event.start.date)
          },
          update: {
            title: event.summary || 'Untitled Event',
            description: event.description,
            startTime,
            endTime,
            isAllDay: Boolean(event.start.date)
          }
        });
      }

      // Update sync metadata
      await prisma.calendarSync.update({
        where: { id: calendarSync.id },
        data: {
          lastSyncAt: new Date(),
          nextSyncAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          syncToken: response.data.nextSyncToken || calendarSync.syncToken
        }
      });
    } catch (error) {
      console.error('Error syncing from Google Calendar:', error);
      throw error;
    }
  }

  async pushEventToGoogle(
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    calendarId: string = 'primary'
  ): Promise<string> {
    try {
      const calendar = this.getCalendarClient();

      const event = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: title,
          description,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Chicago'
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Chicago'
          }
        }
      });

      return event.data.id || '';
    } catch (error) {
      console.error('Error pushing event to Google Calendar:', error);
      throw error;
    }
  }

  async listCalendars() {
    try {
      const calendar = this.getCalendarClient();
      const response = await calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }

  async getAvailableTimeSlots(
    date: Date,
    duration: number = 60,
    calendarId: string = 'primary'
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      const calendar = this.getCalendarClient();

      const dayStart = new Date(date);
      dayStart.setHours(9, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(17, 0, 0, 0);

      const response = await calendar.events.list({
        calendarId,
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const availableSlots: { start: Date; end: Date }[] = [];

      let currentTime = dayStart;

      for (const event of events) {
        const eventStart = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : null;
        const eventEnd = event.end?.dateTime ? new Date(event.end.dateTime) : null;

        if (!eventStart || !eventEnd) continue;

        // If there's a gap before this event
        if (
          eventStart.getTime() - currentTime.getTime() >=
          duration * 60 * 1000
        ) {
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(eventStart)
          });
        }

        currentTime = eventEnd > currentTime ? eventEnd : currentTime;
      }

      // Check if there's time left at the end of the day
      if (dayEnd.getTime() - currentTime.getTime() >= duration * 60 * 1000) {
        availableSlots.push({
          start: new Date(currentTime),
          end: dayEnd
        });
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw error;
    }
  }
}

export async function syncAllUserCalendars(userId: string, accessToken: string) {
  const sync = new GoogleCalendarSync(userId, accessToken);

  // Get all enabled calendar syncs for this user
  const calendarSyncs = await prisma.calendarSync.findMany({
    where: {
      userId,
      syncEnabled: true
    }
  });

  for (const calendarSync of calendarSyncs) {
    await sync.syncFromGoogle(calendarSync.calendarId);
  }
}
