import { google, calendar_v3 } from "googleapis";
import type { Auth } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import { DatabaseService } from "./database";
import { AuthProvider } from "@prisma/client";

// ---------------- Types ----------------

// ---------------- Helpers: Clients ----------------

function gmailClientFromAccessToken(accessToken: string) {
  const auth = new google.auth.OAuth2() as Auth.OAuth2Client;
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

function graphClientFromAccessToken(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

// ---------------- Service ----------------

export class CalendarService {
  private databaseService: DatabaseService;

  constructor() {
    console.log(`[CALENDAR_SERVICE] Initializing CalendarService`);
    this.databaseService = new DatabaseService();
    console.log(`[CALENDAR_SERVICE] CalendarService initialized successfully`);
  }

  async createEvent(
    userEmail: string,
    eventData: CreateEventData,
  ): Promise<{
    id: string;
    summary: string;
    description?: string;
    hangoutLink?: string;
  }> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Creating calendar event for user: ${userEmail}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.createGmailEvent(user.accessToken, eventData);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.createOutlookEvent(user.accessToken, eventData);
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(`[CALENDAR_SERVICE] Error creating event:`, error);
      throw error;
    }
  }

  async getEvent(
    userEmail: string,
    eventId: string,
  ): Promise<CalendarEvent | null> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Getting calendar event ${eventId} for user: ${userEmail}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.getGmailEvent(user.accessToken, eventId);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.getOutlookEvent(user.accessToken, eventId);
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(`[CALENDAR_SERVICE] Error getting event:`, error);
      throw error;
    }
  }

  async updateEvent(
    userEmail: string,
    eventId: string,
    eventData: Partial<CreateEventData>,
  ): Promise<CalendarEvent> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Updating calendar event ${eventId} for user: ${userEmail}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.updateGmailEvent(
          user.accessToken,
          eventId,
          eventData,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.updateOutlookEvent(
          user.accessToken,
          eventId,
          eventData,
        );
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(`[CALENDAR_SERVICE] Error updating event:`, error);
      throw error;
    }
  }

  async deleteEvent(userEmail: string, eventId: string): Promise<void> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Deleting calendar event ${eventId} for user: ${userEmail}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        await this.deleteGmailEvent(user.accessToken, eventId);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        await this.deleteOutlookEvent(user.accessToken, eventId);
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(`[CALENDAR_SERVICE] Error deleting event:`, error);
      throw error;
    }
  }

  async listEvents(
    userEmail: string,
    startDate: string,
    endDate: string,
    maxResults: number = 100,
  ): Promise<CalendarEvent[]> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Listing calendar events for user: ${userEmail} from ${startDate} to ${endDate}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.listGmailEvents(
          user.accessToken,
          startDate,
          endDate,
          maxResults,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.listOutlookEvents(
          user.accessToken,
          startDate,
          endDate,
          maxResults,
        );
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(`[CALENDAR_SERVICE] Error listing events:`, error);
      throw error;
    }
  }

  async checkForConflicts(
    userEmail: string,
    eventData: CreateEventData,
  ): Promise<ConflictCheckResult> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Checking conflicts for user: ${userEmail}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.checkGmailConflicts(user.accessToken, eventData);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.checkOutlookConflicts(user.accessToken, eventData);
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(`[CALENDAR_SERVICE] Error checking conflicts:`, error);
      throw error;
    }
  }

  async canUserEditEvent(userEmail: string, eventId: string): Promise<boolean> {
    try {
      console.log(
        `[CALENDAR_SERVICE] Checking edit permissions for event ${eventId} for user: ${userEmail}`,
      );

      const user = await this.databaseService.findUserByEmail(userEmail);
      if (!user) throw new Error("User not found");

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.canEditGmailEvent(
          user.accessToken,
          eventId,
          userEmail,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.canEditOutlookEvent(
          user.accessToken,
          eventId,
          userEmail,
        );
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error(
        `[CALENDAR_SERVICE] Error checking edit permissions:`,
        error,
      );
      throw error;
    }
  }

  // ---------------- Gmail Calendar Methods ----------------

  private async createGmailEvent(
    accessToken: string,
    eventData: CreateEventData,
  ): Promise<{
    id: string;
    summary: string;
    description?: string;
    hangoutLink?: string;
  }> {
    const calendar = gmailClientFromAccessToken(accessToken);

    // Format datetime for Google Calendar
    const startDateTime = this.formatDateTimeForGmail(
      eventData.startDate,
      eventData.startTime,
      eventData.timezone,
    );
    const endDateTime = this.formatDateTimeForGmail(
      eventData.startDate,
      eventData.endTime,
      eventData.timezone,
    );

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: startDateTime,
      end: endDateTime,
      attendees: eventData.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus,
      })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    if (eventData.isVirtual !== false) {
      event.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      };
    }

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: eventData.isVirtual !== false ? 1 : 0,
        sendUpdates: "all",
        sendNotifications: true,
      });

      if (!response.data.id) {
        throw new Error("Failed to create calendar event");
      }

      // Extract Meet link
      let hangoutLink: string | undefined;
      if (response.data.conferenceData?.entryPoints) {
        const meetEntry = response.data.conferenceData.entryPoints.find(
          (entry) => entry.entryPointType === "video",
        );
        hangoutLink = meetEntry?.uri || undefined;
      }

      if (!hangoutLink) {
        hangoutLink = response.data.hangoutLink || undefined;
      }

      return {
        id: response.data.id,
        summary: response.data.summary || "",
        description: response.data.description || undefined,
        hangoutLink,
      };
    } catch (error) {
      console.error("Error creating Gmail calendar event:", error);
      throw new Error(
        `Failed to create Gmail calendar event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async getGmailEvent(
    accessToken: string,
    eventId: string,
  ): Promise<CalendarEvent | null> {
    const calendar = gmailClientFromAccessToken(accessToken);

    try {
      const response = await calendar.events.get({
        calendarId: "primary",
        eventId: eventId,
      });

      if (!response.data.id) {
        return null;
      }

      return {
        id: response.data.id,
        title: response.data.summary || "",
        start: response.data.start?.dateTime || "",
        end: response.data.end?.dateTime || "",
        location: response.data.location || undefined,
        description: response.data.description || undefined,
        attendees: response.data.attendees?.map((attendee) => ({
          email: attendee.email || "",
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || undefined,
        })),
        meetingLink: response.data.hangoutLink || undefined,
        isOnlineMeeting: !!response.data.hangoutLink,
      };
    } catch (error) {
      console.error("Error getting Gmail calendar event:", error);
      return null;
    }
  }

  private async updateGmailEvent(
    accessToken: string,
    eventId: string,
    eventData: Partial<CreateEventData>,
  ): Promise<CalendarEvent> {
    const calendar = gmailClientFromAccessToken(accessToken);

    try {
      // Get current event first
      const currentEvent = await this.getGmailEvent(accessToken, eventId);
      if (!currentEvent) {
        throw new Error("Event not found");
      }

      const updateData: calendar_v3.Schema$Event = {
        summary: eventData.title || currentEvent.title,
        description:
          eventData.description !== undefined
            ? eventData.description
            : currentEvent.description,
        location: eventData.location,
      };

      // Handle date/time updates
      if (eventData.startDate && eventData.startTime) {
        const startDateTime = this.formatDateTimeForGmail(
          eventData.startDate,
          eventData.startTime,
          eventData.timezone,
        );
        const endDateTime = this.formatDateTimeForGmail(
          eventData.startDate,
          eventData.endTime || currentEvent.end.split("T")[1].substring(0, 5),
          eventData.timezone,
        );
        updateData.start = startDateTime;
        updateData.end = endDateTime;
      }

      // Handle attendees
      if (eventData.attendees) {
        updateData.attendees = eventData.attendees
          .map((attendee) => ({
            email: attendee.email,
            displayName: attendee.displayName,
            responseStatus: attendee.responseStatus,
          }))
          .filter((attendee) => attendee.email && attendee.email.trim() !== "");
      }

      const response = await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: updateData,
        sendUpdates: "all",
        sendNotifications: true,
      });

      if (!response.data.id) {
        throw new Error("Failed to update calendar event");
      }

      return {
        id: response.data.id,
        title: response.data.summary || "",
        start: response.data.start?.dateTime || "",
        end: response.data.end?.dateTime || "",
        location: response.data.location || undefined,
        description: response.data.description || undefined,
        attendees: response.data.attendees?.map((attendee) => ({
          email: attendee.email || "",
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || undefined,
        })),
        meetingLink: response.data.hangoutLink || undefined,
        isOnlineMeeting: !!response.data.hangoutLink,
      };
    } catch (error) {
      console.error("Error updating Gmail calendar event:", error);
      throw new Error(
        `Failed to update Gmail calendar event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async deleteGmailEvent(
    accessToken: string,
    eventId: string,
  ): Promise<void> {
    const calendar = gmailClientFromAccessToken(accessToken);

    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });
    } catch (error) {
      console.error("Error deleting Gmail calendar event:", error);
      throw new Error(
        `Failed to delete Gmail calendar event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async listGmailEvents(
    accessToken: string,
    startDate: string,
    endDate: string,
    maxResults: number,
  ): Promise<CalendarEvent[]> {
    const calendar = gmailClientFromAccessToken(accessToken);

    try {
      const startDateTime = new Date(startDate).toISOString();
      const endDateTime = new Date(endDate + "T23:59:59").toISOString();

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: startDateTime,
        timeMax: endDateTime,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      return (response.data.items || []).map((event) => ({
        id: event.id || "",
        title: event.summary || "",
        start: event.start?.dateTime || "",
        end: event.end?.dateTime || "",
        location: event.location || undefined,
        description: event.description || undefined,
        attendees: event.attendees?.map((attendee) => ({
          email: attendee.email || "",
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || undefined,
        })),
        meetingLink: event.hangoutLink || undefined,
        isOnlineMeeting: !!event.hangoutLink,
      }));
    } catch (error) {
      console.error("Error listing Gmail calendar events:", error);
      throw new Error(
        `Failed to list Gmail calendar events: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async checkGmailConflicts(
    accessToken: string,
    eventData: CreateEventData,
  ): Promise<ConflictCheckResult> {
    const calendar = gmailClientFromAccessToken(accessToken);

    try {
      const startDateTime = this.formatDateTimeForGmail(
        eventData.startDate,
        eventData.startTime,
        eventData.timezone,
      );
      const endDateTime = this.formatDateTimeForGmail(
        eventData.startDate,
        eventData.endTime,
        eventData.timezone,
      );

      const startTime = new Date(startDateTime.dateTime);
      const endTime = new Date(endDateTime.dateTime);

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const conflictingEvents = (response.data.items || [])
        .filter((event) => {
          if (!event.start?.dateTime || !event.end?.dateTime) {
            return false;
          }

          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);

          return startTime < eventEnd && endTime > eventStart;
        })
        .map((event) => ({
          summary: event.summary || "",
          start: event.start?.dateTime || "",
          end: event.end?.dateTime || "",
        }));

      return {
        hasConflicts: conflictingEvents.length > 0,
        conflictingEvents,
      };
    } catch (error) {
      console.error("Error checking Gmail calendar conflicts:", error);
      return {
        hasConflicts: false,
        conflictingEvents: [],
      };
    }
  }

  private async canEditGmailEvent(
    accessToken: string,
    eventId: string,
    userEmail: string,
  ): Promise<boolean> {
    const calendar = gmailClientFromAccessToken(accessToken);

    try {
      const response = await calendar.events.get({
        calendarId: "primary",
        eventId: eventId,
      });

      const event = response.data;
      if (!event) return false;

      const creatorEmail = event.creator?.email?.toLowerCase();
      const organizerEmail = event.organizer?.email?.toLowerCase();
      const currentUserEmail = userEmail.toLowerCase();

      return (
        creatorEmail === currentUserEmail || organizerEmail === currentUserEmail
      );
    } catch (error) {
      console.error("Error checking Gmail event edit permissions:", error);
      return false;
    }
  }

  // ---------------- Outlook Calendar Methods ----------------

  private async createOutlookEvent(
    accessToken: string,
    eventData: CreateEventData,
  ): Promise<{
    id: string;
    summary: string;
    description?: string;
    hangoutLink?: string;
  }> {
    const client = graphClientFromAccessToken(accessToken);

    // Format datetime for Outlook
    const startDateTime = this.formatDateTimeForOutlook(
      eventData.startDate,
      eventData.startTime,
      eventData.timezone,
    );
    const endDateTime = this.formatDateTimeForOutlook(
      eventData.startDate,
      eventData.endTime,
      eventData.timezone,
    );

    const eventBody: {
      subject: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      body?: { contentType: string; content: string };
      attendees?: Array<{
        emailAddress: { address: string; name: string };
        type: string;
      }>;
      isOnlineMeeting?: boolean;
      onlineMeetingProvider?: string;
      location?: { displayName: string };
    } = {
      subject: eventData.title,
      start: startDateTime,
      end: endDateTime,
    };

    if (eventData.description) {
      eventBody.body = {
        contentType: "HTML",
        content: eventData.description,
      };
    }

    if (eventData.attendees && eventData.attendees.length > 0) {
      eventBody.attendees = eventData.attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.displayName || attendee.email.split("@")[0],
        },
        type: "required",
      }));
    }

    if (eventData.isVirtual) {
      eventBody.isOnlineMeeting = true;
      eventBody.onlineMeetingProvider = "teamsForBusiness";
    }

    if (eventData.location) {
      eventBody.location = {
        displayName: eventData.location,
      };
    }

    try {
      const response = await client
        .api("/me/calendar/events")
        .query({
          sendNotifications: "true",
          responseRequested: "true",
        })
        .post(eventBody);

      // Extract Teams meeting link
      let teamsLink: string | undefined;
      if (response.onlineMeeting?.joinUrl) {
        teamsLink = response.onlineMeeting.joinUrl;
      }

      return {
        id: response.id,
        summary: response.subject,
        description: response.body?.content,
        hangoutLink: teamsLink,
      };
    } catch (error) {
      console.error("Error creating Outlook calendar event:", error);
      throw new Error(
        `Failed to create Outlook calendar event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async getOutlookEvent(
    accessToken: string,
    eventId: string,
  ): Promise<CalendarEvent | null> {
    const client = graphClientFromAccessToken(accessToken);

    try {
      const response = await client
        .api(`/me/calendar/events/${eventId}`)
        .select(
          "id,subject,start,end,location,body,attendees,organizer,onlineMeeting,isOnlineMeeting",
        )
        .get();

      if (!response) return null;

      return {
        id: response.id,
        title: response.subject || "",
        start: response.start?.dateTime || "",
        end: response.end?.dateTime || "",
        location: response.location?.displayName,
        description: response.body?.content,
        attendees: response.attendees?.map(
          (attendee: {
            emailAddress?: { address?: string; name?: string };
            status?: { response?: string };
          }) => ({
            email: attendee.emailAddress?.address || "",
            displayName: attendee.emailAddress?.name || undefined,
            responseStatus: attendee.status?.response || undefined,
          }),
        ),
        meetingLink: response.onlineMeeting?.joinUrl,
        isOnlineMeeting: !!response.isOnlineMeeting,
      };
    } catch (error) {
      console.error("Error getting Outlook calendar event:", error);
      return null;
    }
  }

  private async updateOutlookEvent(
    accessToken: string,
    eventId: string,
    eventData: Partial<CreateEventData>,
  ): Promise<CalendarEvent> {
    const client = graphClientFromAccessToken(accessToken);

    try {
      const updateBody: {
        subject?: string;
        start?: { dateTime: string; timeZone: string };
        end?: { dateTime: string; timeZone: string };
        body?: { contentType: string; content: string };
      } = {};

      if (eventData.title) {
        updateBody.subject = eventData.title;
      }

      if (eventData.startDate && eventData.startTime) {
        const startDateTime = this.formatDateTimeForOutlook(
          eventData.startDate,
          eventData.startTime,
          eventData.timezone,
        );
        const endDateTime = this.formatDateTimeForOutlook(
          eventData.startDate,
          eventData.endTime || "23:59",
          eventData.timezone,
        );
        updateBody.start = startDateTime;
        updateBody.end = endDateTime;
      }

      if (eventData.description !== undefined) {
        updateBody.body = {
          contentType: "HTML",
          content: eventData.description,
        };
      }

      await client
        .api(`/me/calendar/events/${eventId}`)
        .query({ sendNotifications: "true" })
        .patch(updateBody);

      // Get the updated event
      const updatedEvent = await this.getOutlookEvent(accessToken, eventId);
      if (!updatedEvent) {
        throw new Error("Failed to retrieve updated event");
      }

      return updatedEvent;
    } catch (error) {
      console.error("Error updating Outlook calendar event:", error);
      throw new Error(
        `Failed to update Outlook calendar event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async deleteOutlookEvent(
    accessToken: string,
    eventId: string,
  ): Promise<void> {
    const client = graphClientFromAccessToken(accessToken);

    try {
      await client.api(`/me/calendar/events/${eventId}`).delete();
    } catch (error) {
      console.error("Error deleting Outlook calendar event:", error);
      throw new Error(
        `Failed to delete Outlook calendar event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async listOutlookEvents(
    accessToken: string,
    startDate: string,
    endDate: string,
    maxResults: number,
  ): Promise<CalendarEvent[]> {
    const client = graphClientFromAccessToken(accessToken);

    try {
      const response = await client
        .api("/me/calendar/events")
        .filter(
          `start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`,
        )
        .select(
          "id,subject,start,end,location,body,attendees,organizer,onlineMeeting,isOnlineMeeting",
        )
        .orderby("start/dateTime")
        .top(maxResults)
        .get();

      return (response.value || []).map(
        (event: {
          id: string;
          subject?: string;
          start?: { dateTime?: string };
          end?: { dateTime?: string };
          location?: { displayName?: string };
          body?: { content?: string };
          attendees?: Array<{
            emailAddress?: { address?: string; name?: string };
            status?: { response?: string };
          }>;
          onlineMeeting?: { joinUrl?: string };
          isOnlineMeeting?: boolean;
        }) => ({
          id: event.id,
          title: event.subject || "",
          start: event.start?.dateTime || "",
          end: event.end?.dateTime || "",
          location: event.location?.displayName,
          description: event.body?.content,
          attendees: event.attendees?.map(
            (attendee: {
              emailAddress?: { address?: string; name?: string };
              status?: { response?: string };
            }) => ({
              email: attendee.emailAddress?.address || "",
              displayName: attendee.emailAddress?.name || undefined,
              responseStatus: attendee.status?.response || undefined,
            }),
          ),
          meetingLink: event.onlineMeeting?.joinUrl,
          isOnlineMeeting: !!event.isOnlineMeeting,
        }),
      );
    } catch (error) {
      console.error("Error listing Outlook calendar events:", error);
      throw new Error(
        `Failed to list Outlook calendar events: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async checkOutlookConflicts(
    accessToken: string,
    eventData: CreateEventData,
  ): Promise<ConflictCheckResult> {
    const client = graphClientFromAccessToken(accessToken);

    try {
      const startDateTime = this.formatDateTimeForOutlook(
        eventData.startDate,
        eventData.startTime,
        eventData.timezone,
      );
      const endDateTime = this.formatDateTimeForOutlook(
        eventData.startDate,
        eventData.endTime,
        eventData.timezone,
      );

      const startTime = new Date(startDateTime.dateTime + "Z");
      const endTime = new Date(endDateTime.dateTime + "Z");

      const response = await client
        .api("/me/calendar/events")
        .filter(
          `start/dateTime lt '${endTime.toISOString()}' and end/dateTime gt '${startTime.toISOString()}'`,
        )
        .select("id,subject,start,end")
        .get();

      const conflictingEvents = (response.value || []).map(
        (event: {
          subject?: string;
          start?: { dateTime?: string };
          end?: { dateTime?: string };
        }) => ({
          summary: event.subject || "",
          start: event.start?.dateTime || "",
          end: event.end?.dateTime || "",
        }),
      );

      return {
        hasConflicts: conflictingEvents.length > 0,
        conflictingEvents,
      };
    } catch (error) {
      console.error("Error checking Outlook calendar conflicts:", error);
      return {
        hasConflicts: false,
        conflictingEvents: [],
      };
    }
  }

  private async canEditOutlookEvent(
    accessToken: string,
    eventId: string,
    userEmail: string,
  ): Promise<boolean> {
    const client = graphClientFromAccessToken(accessToken);

    try {
      const response = await client
        .api(`/me/calendar/events/${eventId}`)
        .select("organizer")
        .get();

      if (!response?.organizer?.emailAddress?.address) {
        return true; // If no organizer info, assume user can edit
      }

      const organizerEmail =
        response.organizer.emailAddress.address.toLowerCase();
      const currentUserEmail = userEmail.toLowerCase();

      return organizerEmail === currentUserEmail;
    } catch (error) {
      console.error("Error checking Outlook event edit permissions:", error);
      return false;
    }
  }

  // ---------------- Helper Methods ----------------

  private formatDateTimeForGmail(
    date: string,
    time: string,
    timezone?: string,
  ): { dateTime: string; timeZone: string } {
    const [hours, minutes] = time.split(":").map(Number);
    const [year, month, day] = date.split("-").map(Number);

    const localDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    // Format as local time without UTC conversion for Google Calendar API
    const formatLocalDateTime = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    return {
      dateTime: formatLocalDateTime(localDateTime),
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private formatDateTimeForOutlook(
    date: string,
    time: string,
    timezone?: string,
  ): { dateTime: string; timeZone: string } {
    const [hours, minutes] = time.split(":").map(Number);
    const [year, month, day] = date.split("-").map(Number);

    const localDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    // Format as YYYY-MM-DDTHH:mm:ss without timezone indicator
    const formatDateTime = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    return {
      dateTime: formatDateTime(localDateTime),
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
