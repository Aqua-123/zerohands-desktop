import { contextBridge, ipcRenderer } from "electron";
import { CALENDAR_CHANNELS } from "./calendar-channels";
import { CalendarEvent, ConflictCheckResult, CreateEventData } from "@/types";

export interface CalendarContext {
  // Event management
  createEvent: (
    userEmail: string,
    eventData: CreateEventData,
  ) => Promise<{
    id: string;
    summary: string;
    description?: string;
    hangoutLink?: string;
  }>;
  getEvent: (
    userEmail: string,
    eventId: string,
  ) => Promise<CalendarEvent | null>;
  updateEvent: (
    userEmail: string,
    eventId: string,
    eventData: Partial<CreateEventData>,
  ) => Promise<CalendarEvent>;
  deleteEvent: (
    userEmail: string,
    eventId: string,
  ) => Promise<{ success: boolean }>;
  listEvents: (
    userEmail: string,
    startDate: string,
    endDate: string,
    maxResults?: number,
  ) => Promise<CalendarEvent[]>;

  // Conflict checking
  checkConflicts: (
    userEmail: string,
    eventData: CreateEventData,
  ) => Promise<ConflictCheckResult>;

  // Permissions
  canEditEvent: (userEmail: string, eventId: string) => Promise<boolean>;

  // Error handling
  onCalendarError: (callback: (error: string) => void) => void;
}

const calendarContext: CalendarContext = {
  // Event management
  createEvent: (userEmail: string, eventData: CreateEventData) =>
    ipcRenderer.invoke(CALENDAR_CHANNELS.CREATE_EVENT, userEmail, eventData),

  getEvent: (userEmail: string, eventId: string) =>
    ipcRenderer.invoke(CALENDAR_CHANNELS.GET_EVENT, userEmail, eventId),

  updateEvent: (
    userEmail: string,
    eventId: string,
    eventData: Partial<CreateEventData>,
  ) =>
    ipcRenderer.invoke(
      CALENDAR_CHANNELS.UPDATE_EVENT,
      userEmail,
      eventId,
      eventData,
    ),

  deleteEvent: (userEmail: string, eventId: string) =>
    ipcRenderer.invoke(CALENDAR_CHANNELS.DELETE_EVENT, userEmail, eventId),

  listEvents: (
    userEmail: string,
    startDate: string,
    endDate: string,
    maxResults?: number,
  ) =>
    ipcRenderer.invoke(
      CALENDAR_CHANNELS.LIST_EVENTS,
      userEmail,
      startDate,
      endDate,
      maxResults,
    ),

  // Conflict checking
  checkConflicts: (userEmail: string, eventData: CreateEventData) =>
    ipcRenderer.invoke(CALENDAR_CHANNELS.CHECK_CONFLICTS, userEmail, eventData),

  // Permissions
  canEditEvent: (userEmail: string, eventId: string) =>
    ipcRenderer.invoke(CALENDAR_CHANNELS.CAN_EDIT_EVENT, userEmail, eventId),

  // Error handling
  onCalendarError: (callback: (error: string) => void) => {
    ipcRenderer.on(CALENDAR_CHANNELS.CALENDAR_ERROR, (_, error: string) => {
      callback(error);
    });
  },
};

contextBridge.exposeInMainWorld("calendar", calendarContext);

export default calendarContext;
