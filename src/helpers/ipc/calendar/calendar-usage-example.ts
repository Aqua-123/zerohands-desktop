/**
 * Calendar IPC Usage Examples
 *
 * This file demonstrates how to use the calendar functionality in the renderer process.
 * Import calendarContext and use the methods as shown below.
 */

import calendarContext from "./calendar-context";
import { CreateEventData } from "@/types";
// Example: Create a calendar event
export async function createMeetingExample(userEmail: string) {
  try {
    const eventData: CreateEventData = {
      title: "Team Meeting",
      startDate: "2024-01-15",
      startTime: "14:00",
      endTime: "15:00",
      description: "Weekly team sync meeting",
      attendees: [
        { email: "colleague1@example.com", displayName: "John Doe" },
        { email: "colleague2@example.com", displayName: "Jane Smith" },
      ],
      isVirtual: true,
      location: "Conference Room A",
      timezone: "America/New_York",
    };

    const result = await calendarContext.createEvent(userEmail, eventData);
    console.log("Event created:", result);
    return result;
  } catch (error) {
    console.error("Failed to create event:", error);
    throw error;
  }
}

// Example: Check for conflicts before creating an event
export async function checkConflictsExample(userEmail: string) {
  try {
    const eventData: CreateEventData = {
      title: "Conflict Check",
      startDate: "2024-01-15",
      startTime: "14:00",
      endTime: "15:00",
      timezone: "America/New_York",
    };

    const conflicts = await calendarContext.checkConflicts(
      userEmail,
      eventData,
    );

    if (conflicts.hasConflicts) {
      console.log("Conflicts found:", conflicts.conflictingEvents);
      return {
        hasConflicts: true,
        conflictingEvents: conflicts.conflictingEvents,
      };
    } else {
      console.log("No conflicts found");
      return { hasConflicts: false, conflictingEvents: [] };
    }
  } catch (error) {
    console.error("Failed to check conflicts:", error);
    throw error;
  }
}

// Example: List events for a date range
export async function listEventsExample(userEmail: string) {
  try {
    const startDate = "2024-01-01";
    const endDate = "2024-01-31";

    const events = await calendarContext.listEvents(
      userEmail,
      startDate,
      endDate,
      50,
    );
    console.log(`Found ${events.length} events`);

    events.forEach((event) => {
      console.log(`- ${event.title} (${event.start} to ${event.end})`);
      if (event.meetingLink) {
        console.log(`  Meeting Link: ${event.meetingLink}`);
      }
    });

    return events;
  } catch (error) {
    console.error("Failed to list events:", error);
    throw error;
  }
}

// Example: Update an existing event
export async function updateEventExample(userEmail: string, eventId: string) {
  try {
    const updateData: Partial<CreateEventData> = {
      title: "Updated Team Meeting",
      description: "Updated description for the meeting",
      location: "Conference Room B",
    };

    const updatedEvent = await calendarContext.updateEvent(
      userEmail,
      eventId,
      updateData,
    );
    console.log("Event updated:", updatedEvent);
    return updatedEvent;
  } catch (error) {
    console.error("Failed to update event:", error);
    throw error;
  }
}

// Example: Delete an event
export async function deleteEventExample(userEmail: string, eventId: string) {
  try {
    // First check if user can edit the event
    const canEdit = await calendarContext.canEditEvent(userEmail, eventId);

    if (!canEdit) {
      throw new Error("You don't have permission to delete this event");
    }

    const result = await calendarContext.deleteEvent(userEmail, eventId);
    console.log("Event deleted:", result);
    return result;
  } catch (error) {
    console.error("Failed to delete event:", error);
    throw error;
  }
}

// Example: Set up error handling
export function setupCalendarErrorHandling() {
  calendarContext.onCalendarError((error: string) => {
    console.error("Calendar error:", error);
    // You can show a toast notification or update UI state here
    // For example: showToast(`Calendar Error: ${error}`, 'error');
  });
}

// Example: Complete workflow - Create event with conflict checking
export async function createEventWithConflictCheck(userEmail: string) {
  try {
    const eventData: CreateEventData = {
      title: "Important Meeting",
      startDate: "2024-01-15",
      startTime: "14:00",
      endTime: "15:00",
      description: "Important client meeting",
      attendees: [{ email: "client@example.com", displayName: "Client Name" }],
      isVirtual: false,
      location: "Office Conference Room",
      timezone: "America/New_York",
    };

    // Step 1: Check for conflicts
    const conflicts = await calendarContext.checkConflicts(
      userEmail,
      eventData,
    );

    if (conflicts.hasConflicts) {
      console.warn("Conflicts detected:", conflicts.conflictingEvents);
      // You might want to show a confirmation dialog to the user
      // const shouldProceed = await showConfirmationDialog(
      //   `You have ${conflicts.conflictingEvents.length} conflicting event(s). Do you want to proceed?`
      // );
      // if (!shouldProceed) return null;
    }

    // Step 2: Create the event
    const result = await calendarContext.createEvent(userEmail, eventData);

    console.log("Event created successfully:", result);

    // Step 3: Return result with conflict information
    return {
      event: result,
      conflicts: conflicts,
    };
  } catch (error) {
    console.error("Failed to create event with conflict check:", error);
    throw error;
  }
}
