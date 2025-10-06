export const CALENDAR_CHANNELS = {
  // Event management
  CREATE_EVENT: "calendar:create-event",
  GET_EVENT: "calendar:get-event",
  UPDATE_EVENT: "calendar:update-event",
  DELETE_EVENT: "calendar:delete-event",
  LIST_EVENTS: "calendar:list-events",

  // Conflict checking
  CHECK_CONFLICTS: "calendar:check-conflicts",

  // Permissions
  CAN_EDIT_EVENT: "calendar:can-edit-event",

  // Error handling
  CALENDAR_ERROR: "calendar:error",
} as const;
