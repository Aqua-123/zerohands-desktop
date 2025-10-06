# Calendar IPC Handlers

This module provides IPC handlers for calendar functionality, supporting both Gmail (Google Calendar) and Outlook calendars through a unified interface.

## Features

- ✅ Create calendar events
- ✅ Get calendar events by ID
- ✅ Update existing calendar events
- ✅ Delete calendar events
- ✅ List events for a date range
- ✅ Check for scheduling conflicts
- ✅ Verify user permissions for event editing
- ✅ Support for virtual meetings (Google Meet / Teams)
- ✅ Attendee management
- ✅ Timezone handling

## Architecture

The calendar functionality follows the same pattern as other IPC modules in this repository:

```
src/helpers/ipc/calendar/
├── calendar-channels.ts      # IPC channel definitions
├── calendar-context.ts       # Renderer process context
├── calendar-listeners.ts     # Main process IPC handlers
├── calendar-usage-example.ts # Usage examples
└── README.md                # This documentation
```

## Usage

### 1. Import the calendar context

```typescript
import calendarContext from '../helpers/ipc/calendar/calendar-context';
```

### 2. Create a calendar event

```typescript
const eventData = {
  title: "Team Meeting",
  startDate: "2024-01-15",
  startTime: "14:00",
  endTime: "15:00",
  description: "Weekly team sync",
  attendees: [
    { email: "colleague@example.com", displayName: "John Doe" }
  ],
  isVirtual: true,
  location: "Conference Room A",
  timezone: "America/New_York"
};

const result = await calendarContext.createEvent(userEmail, eventData);
```

### 3. Check for conflicts

```typescript
const conflicts = await calendarContext.checkConflicts(userEmail, eventData);
if (conflicts.hasConflicts) {
  console.log("Conflicts found:", conflicts.conflictingEvents);
}
```

### 4. List events

```typescript
const events = await calendarContext.listEvents(
  userEmail, 
  "2024-01-01", 
  "2024-01-31", 
  50 // maxResults
);
```

### 5. Update an event

```typescript
const updatedEvent = await calendarContext.updateEvent(
  userEmail, 
  eventId, 
  { title: "Updated Meeting Title" }
);
```

### 6. Delete an event

```typescript
const canEdit = await calendarContext.canEditEvent(userEmail, eventId);
if (canEdit) {
  await calendarContext.deleteEvent(userEmail, eventId);
}
```

## Data Types

### CreateEventData

```typescript
interface CreateEventData {
  title: string;
  startDate: string;        // Format: YYYY-MM-DD
  startTime: string;        // Format: HH:mm (24-hour)
  endTime: string;          // Format: HH:mm (24-hour)
  description?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  isVirtual?: boolean;      // Enable virtual meeting
  location?: string;
  timezone?: string;        // Client timezone (e.g., "America/New_York")
}
```

### CalendarEvent

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: string;            // ISO datetime string
  end: string;              // ISO datetime string
  location?: string;
  description?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  meetingLink?: string;     // Google Meet or Teams link
  isOnlineMeeting?: boolean;
  startTimezone?: string;
  endTimezone?: string;
}
```

### ConflictCheckResult

```typescript
interface ConflictCheckResult {
  hasConflicts: boolean;
  conflictingEvents: Array<{
    summary: string;
    start: string;
    end: string;
  }>;
}
```

## Provider Support

### Gmail (Google Calendar)
- ✅ Full CRUD operations
- ✅ Google Meet integration
- ✅ Attendee management
- ✅ Conflict detection
- ✅ Permission checking

### Outlook (Microsoft Graph)
- ✅ Full CRUD operations
- ✅ Teams meeting integration
- ✅ Attendee management
- ✅ Conflict detection
- ✅ Permission checking

## Error Handling

The calendar context provides error handling through the `onCalendarError` method:

```typescript
calendarContext.onCalendarError((error: string) => {
  console.error("Calendar error:", error);
  // Show user-friendly error message
  showToast(`Calendar Error: ${error}`, 'error');
});
```

## Timezone Handling

The calendar service automatically handles timezone conversions:

- **Input**: User provides local time with optional timezone
- **Processing**: Times are converted to provider-specific formats
- **Output**: Events are returned with proper timezone information

## Virtual Meetings

### Google Meet (Gmail users)
- Automatically created when `isVirtual: true`
- Meet link returned in `hangoutLink` field
- Requires Google Workspace account for programmatic creation

### Microsoft Teams (Outlook users)
- Automatically created when `isVirtual: true`
- Teams link returned in `hangoutLink` field
- Works with both personal and business accounts

## Best Practices

1. **Always check for conflicts** before creating important events
2. **Verify permissions** before updating/deleting events
3. **Handle errors gracefully** with user-friendly messages
4. **Use proper timezone information** for accurate scheduling
5. **Validate attendee email addresses** before sending invitations

## Examples

See `calendar-usage-example.ts` for comprehensive usage examples including:
- Basic event creation
- Conflict checking workflow
- Event management operations
- Error handling setup
- Complete workflow examples

## Dependencies

- `googleapis` - Google Calendar API
- `@microsoft/microsoft-graph-client` - Microsoft Graph API
- `@prisma/client` - Database operations
- `electron` - IPC communication

## Notes

- The service automatically detects the user's email provider (Gmail/Outlook)
- All operations are performed using the user's stored access tokens
- Virtual meeting creation may require specific account types (Google Workspace for Gmail)
- The service handles both personal and business accounts for Outlook
