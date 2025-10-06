import { ipcMain, BrowserWindow } from "electron";
import { CalendarService } from "@/services/calendar";
import { CALENDAR_CHANNELS } from "./calendar-channels";
import { CreateEventData } from "@/types";

let calendarService: CalendarService;

export function registerCalendarListeners(mainWindow: BrowserWindow) {
  calendarService = new CalendarService();

  // Create calendar event
  ipcMain.handle(
    CALENDAR_CHANNELS.CREATE_EVENT,
    async (_, userEmail: string, eventData: CreateEventData) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received CREATE_EVENT request for user: ${userEmail}`,
        );

        const result = await calendarService.createEvent(userEmail, eventData);
        console.log(
          `[IPC_CALENDAR] Successfully created calendar event: ${result.id}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create calendar event";
        console.error(
          `[IPC_CALENDAR] Error in CREATE_EVENT for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  // Get calendar event
  ipcMain.handle(
    CALENDAR_CHANNELS.GET_EVENT,
    async (_, userEmail: string, eventId: string) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received GET_EVENT request for user: ${userEmail}, eventId: ${eventId}`,
        );

        const result = await calendarService.getEvent(userEmail, eventId);
        console.log(
          `[IPC_CALENDAR] Successfully retrieved calendar event: ${eventId}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to get calendar event";
        console.error(
          `[IPC_CALENDAR] Error in GET_EVENT for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  // Update calendar event
  ipcMain.handle(
    CALENDAR_CHANNELS.UPDATE_EVENT,
    async (
      _,
      userEmail: string,
      eventId: string,
      eventData: Partial<CreateEventData>,
    ) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received UPDATE_EVENT request for user: ${userEmail}, eventId: ${eventId}`,
        );

        const result = await calendarService.updateEvent(
          userEmail,
          eventId,
          eventData,
        );
        console.log(
          `[IPC_CALENDAR] Successfully updated calendar event: ${eventId}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update calendar event";
        console.error(
          `[IPC_CALENDAR] Error in UPDATE_EVENT for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  // Delete calendar event
  ipcMain.handle(
    CALENDAR_CHANNELS.DELETE_EVENT,
    async (_, userEmail: string, eventId: string) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received DELETE_EVENT request for user: ${userEmail}, eventId: ${eventId}`,
        );

        await calendarService.deleteEvent(userEmail, eventId);
        console.log(
          `[IPC_CALENDAR] Successfully deleted calendar event: ${eventId}`,
        );
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete calendar event";
        console.error(
          `[IPC_CALENDAR] Error in DELETE_EVENT for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  // List calendar events
  ipcMain.handle(
    CALENDAR_CHANNELS.LIST_EVENTS,
    async (
      _,
      userEmail: string,
      startDate: string,
      endDate: string,
      maxResults?: number,
    ) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received LIST_EVENTS request for user: ${userEmail}, from ${startDate} to ${endDate}`,
        );

        const result = await calendarService.listEvents(
          userEmail,
          startDate,
          endDate,
          maxResults || 100,
        );
        console.log(
          `[IPC_CALENDAR] Successfully retrieved ${result.length} calendar events for user: ${userEmail}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to list calendar events";
        console.error(
          `[IPC_CALENDAR] Error in LIST_EVENTS for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  // Check for conflicts
  ipcMain.handle(
    CALENDAR_CHANNELS.CHECK_CONFLICTS,
    async (_, userEmail: string, eventData: CreateEventData) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received CHECK_CONFLICTS request for user: ${userEmail}`,
        );

        const result = await calendarService.checkForConflicts(
          userEmail,
          eventData,
        );
        console.log(
          `[IPC_CALENDAR] Successfully checked conflicts for user: ${userEmail}, hasConflicts: ${result.hasConflicts}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to check conflicts";
        console.error(
          `[IPC_CALENDAR] Error in CHECK_CONFLICTS for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  // Check if user can edit event
  ipcMain.handle(
    CALENDAR_CHANNELS.CAN_EDIT_EVENT,
    async (_, userEmail: string, eventId: string) => {
      try {
        console.log(
          `[IPC_CALENDAR] Received CAN_EDIT_EVENT request for user: ${userEmail}, eventId: ${eventId}`,
        );

        const result = await calendarService.canUserEditEvent(
          userEmail,
          eventId,
        );
        console.log(
          `[IPC_CALENDAR] Successfully checked edit permissions for user: ${userEmail}, canEdit: ${result}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to check edit permissions";
        console.error(
          `[IPC_CALENDAR] Error in CAN_EDIT_EVENT for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(
          CALENDAR_CHANNELS.CALENDAR_ERROR,
          errorMessage,
        );
        throw error;
      }
    },
  );

  console.log(`[IPC_CALENDAR] Calendar listeners registered successfully`);
}
