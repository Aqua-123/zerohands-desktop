import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Video,
  MapPin,
  X,
  Plus,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  TimePicker,
  type Time,
  to12HourTime,
  to24HourTime,
  formatTimeDisplay,
} from "./ui/time-picker";
import { format } from "date-fns";
import { toast } from "sonner";

import LocationAutocomplete from "./LocationAutocomplete";

// Utility function to create a date in local timezone without timezone conversion issues
function createLocalDateTime(date: Date, hour: number, minute: number): Date {
  // Validate input date
  if (!date || isNaN(date.getTime())) {
    console.error("📅 Invalid date passed to createLocalDateTime:", date);
    throw new Error("Invalid date provided to createLocalDateTime");
  }

  // Validate hour and minute values
  if (isNaN(hour) || hour < 0 || hour > 23) {
    console.error("📅 Invalid hour passed to createLocalDateTime:", hour);
    throw new Error(`Invalid hour provided: ${hour}. Must be between 0-23`);
  }

  if (isNaN(minute) || minute < 0 || minute > 59) {
    console.error("📅 Invalid minute passed to createLocalDateTime:", minute);
    throw new Error(`Invalid minute provided: ${minute}. Must be between 0-59`);
  }

  try {
    const localDate = new Date(date);
    localDate.setHours(hour, minute, 0, 0);

    // Validate the resulting date
    if (isNaN(localDate.getTime())) {
      console.error("📅 Result of createLocalDateTime is invalid:", localDate);
      throw new Error("Failed to create valid local datetime");
    }

    return localDate;
  } catch (error) {
    console.error("📅 Error in createLocalDateTime:", error);
    console.error(
      "📅 Input values - date:",
      date,
      "hour:",
      hour,
      "minute:",
      minute,
    );
    throw error;
  }
}

const headerImgStyle: React.CSSProperties = {
  width: "100%",
  height: 60,
  objectFit: "cover",
  borderTopLeftRadius: 15,
  borderTopRightRadius: 15,
  marginBottom: 0,
  display: "block",
};

const innerStyle: React.CSSProperties = {
  borderRadius: 15,
  background: "#FFF",
  minWidth: 650,
  maxWidth: 650,
  margin: "0 auto",
  boxShadow: "0px 4px 46.9px 0px rgba(104, 104, 104, 0.15)",
};

interface MeetingData {
  title: string;
  startDate: Date;
  startTime: Time;
  endTime: Time;
  participants: string[];
  description: string;
  isVirtual: boolean;
  location?: string; // Added location field
}

export interface MeetingDataAPI {
  title: string;
  startDate: string;
  startTime: string;
  endTime: string;
  participants: string;
  description: string;
  isVirtual: boolean;
  location?: string; // Added location field
  timezone?: string; // Client timezone
}

interface EnhancedScheduleMeetingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: MeetingDataAPI) => void;
  initialDate?: Date | null;
  initialData?: Partial<MeetingData>;
  participants?: string[];
  emailDateHeaders?: Record<string, string>;
}

export default function EnhancedScheduleMeetingPopup({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialData = {},
  participants = [],
  emailDateHeaders = {},
}: EnhancedScheduleMeetingPopupProps) {
  const [meetingData, setMeetingData] = useState<MeetingData>(() => {
    // Validate and sanitize the initial date
    let date: Date;

    if (initialDate && !isNaN(initialDate.getTime())) {
      date = initialDate;
    } else if (
      initialData.startDate &&
      !isNaN(new Date(initialData.startDate).getTime())
    ) {
      date = new Date(initialData.startDate);
    } else {
      console.warn("📅 Invalid initial date provided, using current date");
      date = new Date();
    }

    // Ensure we have a valid date
    if (isNaN(date.getTime())) {
      console.error("📅 Date validation failed, falling back to current date");
      date = new Date();
    }

    // Convert 24-hour time to 12-hour format for display
    const startHour24 =
      initialData.startTime?.hour || (initialDate ? initialDate.getHours() : 9);
    const startMinute =
      initialData.startTime?.minute ||
      (initialDate ? initialDate.getMinutes() : 0);
    const startTime12 = to12HourTime(startHour24);
    const startTime: Time = {
      hour: startTime12.hour,
      minute: startMinute,
      period: startTime12.period,
    };

    // Calculate end time (1 hour later)
    const endDate = new Date(date);
    if (initialData.endTime) {
      // Use provided end time
    } else if (initialDate) {
      endDate.setTime(initialDate.getTime() + 60 * 60 * 1000); // Add 1 hour
    } else {
      endDate.setHours(10, 0, 0, 0);
    }
    const endHour24 = initialData.endTime?.hour || endDate.getHours();
    const endMinute = initialData.endTime?.minute || endDate.getMinutes();
    const endTime12 = to12HourTime(endHour24);
    const endTime: Time = {
      hour: endTime12.hour,
      minute: endMinute,
      period: endTime12.period,
    };

    return {
      title: initialData.title || "",
      startDate: date,
      startTime,
      endTime,
      participants: initialData.participants || participants,
      description: initialData.description || "",
      isVirtual:
        initialData.isVirtual !== undefined ? initialData.isVirtual : true,
      location: initialData.location || "",
    };
  });

  const [newAttendee, setNewAttendee] = useState("");
  const [attendeeSuggestions, setAttendeeSuggestions] = useState<string[]>([]);
  const [showAttendeeSuggestions, setShowAttendeeSuggestions] = useState(false);

  useEffect(() => {
    if (initialDate && isOpen) {
      // Convert 24-hour time to 12-hour format
      const startTime12 = to12HourTime(initialDate.getHours());
      const startTime: Time = {
        hour: startTime12.hour,
        minute: initialDate.getMinutes(),
        period: startTime12.period,
      };

      const endDate = new Date(initialDate.getTime() + 60 * 60 * 1000);
      const endTime12 = to12HourTime(endDate.getHours());
      const endTime: Time = {
        hour: endTime12.hour,
        minute: endDate.getMinutes(),
        period: endTime12.period,
      };

      setMeetingData((prev) => ({
        ...prev,
        startDate: initialDate,
        startTime,
        endTime,
      }));
    }
  }, [initialDate, isOpen]);

  const handleInputChange = <K extends keyof MeetingData>(
    field: K,
    value: MeetingData[K],
  ) => {
    setMeetingData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addAttendee = (email: string) => {
    const trimmedEmail = email.trim();
    if (
      trimmedEmail &&
      trimmedEmail.includes("@") &&
      !meetingData.participants.includes(trimmedEmail)
    ) {
      setMeetingData((prev) => ({
        ...prev,
        participants: [...prev.participants, trimmedEmail],
      }));
      setNewAttendee("");
      setShowAttendeeSuggestions(false);
    }
  };

  const handleAttendeeInputChange = (value: string) => {
    setNewAttendee(value);

    if (value.trim()) {
      // Get suggestions from past emails
      const suggestions = Object.keys(emailDateHeaders).filter(
        (email) =>
          email.toLowerCase().includes(value.toLowerCase()) &&
          !meetingData.participants.includes(email),
      );
      setAttendeeSuggestions(suggestions.slice(0, 5));
      setShowAttendeeSuggestions(suggestions.length > 0);
    } else {
      setShowAttendeeSuggestions(false);
    }
  };

  const handleAttendeeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAttendee(newAttendee);
    }
  };

  const removeAttendee = (email: string) => {
    setMeetingData((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p !== email),
    }));
  };

  const handleSave = () => {
    if (!meetingData.title?.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    // Validate meeting data before processing
    if (!meetingData.startDate || isNaN(meetingData.startDate.getTime())) {
      toast.error("Invalid meeting date");
      console.error(
        "📅 Invalid startDate in meetingData:",
        meetingData.startDate,
      );
      return;
    }

    if (!meetingData.startTime.period || !meetingData.endTime.period) {
      toast.error("Please select AM/PM for both start and end times");
      return;
    }

    try {
      // Convert 12-hour time to 24-hour for calculations
      const startHour24 = to24HourTime(
        meetingData.startTime.hour,
        meetingData.startTime.period!,
      );
      const endHour24 = to24HourTime(
        meetingData.endTime.hour,
        meetingData.endTime.period!,
      );

      console.log("📅 Time conversion:", {
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        startHour24,
        endHour24,
      });

      // Create dates in local timezone using utility function
      const startDateTime = createLocalDateTime(
        meetingData.startDate,
        startHour24,
        meetingData.startTime.minute,
      );
      let endDateTime = createLocalDateTime(
        meetingData.startDate,
        endHour24,
        meetingData.endTime.minute,
      );

      // Handle midnight crossover: if end time is 00:00 and start time is not 00:00,
      // treat end time as next day
      if (endHour24 === 0 && startHour24 > 0) {
        // End at midnight, start not at midnight
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      } else if (endDateTime <= startDateTime) {
        // For other cases where end time is before start time, add 1 hour safely
        // Use setTime() to avoid invalid hour values
        endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour using milliseconds
      }

      // Format times in UTC for consistency with backend
      const startTimeFormatted = `${startHour24.toString().padStart(2, "0")}:${meetingData.startTime.minute.toString().padStart(2, "0")}`;
      const endTimeFormatted = `${endHour24.toString().padStart(2, "0")}:${meetingData.endTime.minute.toString().padStart(2, "0")}`;

      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log("📅 Frontend datetime creation:");
      console.log(`📅 Client Timezone: ${clientTimezone}`);
      console.log(`📅 Local start: ${startDateTime.toString()}`);
      console.log(`📅 Local end: ${endDateTime.toString()}`);
      console.log(`📅 UTC start: ${startDateTime.toISOString()}`);
      console.log(`📅 UTC end: ${endDateTime.toISOString()}`);
      console.log(
        `📅 Formatted times: ${startTimeFormatted} to ${endTimeFormatted}`,
      );

      // Additional validation before creating API data
      console.log("📅 About to create meetingDataAPI with:");
      console.log("📅 startDateTime object:", startDateTime);
      console.log("📅 endDateTime object:", endDateTime);
      console.log("📅 startDateTime.getTime():", startDateTime.getTime());
      console.log("📅 endDateTime.getTime():", endDateTime.getTime());
      console.log("📅 startDateTime valid?", !isNaN(startDateTime.getTime()));
      console.log("📅 endDateTime valid?", !isNaN(endDateTime.getTime()));

      // Check if the Date objects themselves are valid before calling toISOString
      if (isNaN(startDateTime.getTime())) {
        console.error("📅 startDateTime is invalid:", startDateTime);
        throw new Error("StartDateTime is invalid");
      }
      if (isNaN(endDateTime.getTime())) {
        console.error("📅 endDateTime is invalid:", endDateTime);
        throw new Error("EndDateTime is invalid");
      }

      console.log("📅 About to call toISOString() on valid dates...");
      const startISOString = startDateTime.toISOString();
      const endISOString = endDateTime.toISOString();
      console.log("📅 startDateTime.toISOString():", startISOString);
      console.log("📅 endDateTime.toISOString():", endISOString);

      // Validate the ISO strings
      if (isNaN(Date.parse(startISOString))) {
        throw new Error("StartDateTime produces invalid ISO string");
      }
      if (isNaN(Date.parse(endISOString))) {
        throw new Error("EndDateTime produces invalid ISO string");
      }

      // Validate each field before creating the API object
      console.log("📅 Validating meetingData fields:");
      console.log("📅 title:", meetingData.title);
      console.log("📅 participants array:", meetingData.participants);
      console.log("📅 description:", meetingData.description);
      console.log("📅 isVirtual:", meetingData.isVirtual);
      console.log("📅 location:", meetingData.location);
      console.log("📅 clientTimezone:", clientTimezone);

      // Safely join participants
      let participantsString = "";
      try {
        if (Array.isArray(meetingData.participants)) {
          participantsString = meetingData.participants.join(",");
          console.log("📅 participants joined:", participantsString);
        } else {
          console.warn(
            "📅 participants is not an array:",
            meetingData.participants,
          );
          participantsString = "";
        }
      } catch (error) {
        console.error("📅 Error joining participants:", error);
        participantsString = "";
      }

      const meetingDataAPI: MeetingDataAPI = {
        title: meetingData.title,
        startDate: startISOString, // Use the validated ISO string
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        participants: participantsString,
        description: meetingData.description || "",
        isVirtual: meetingData.isVirtual,
        location: meetingData.location || "",
        timezone: clientTimezone, // Send client timezone
      };

      console.log("📅 Created meetingDataAPI:", meetingDataAPI);
      console.log("📅 About to call onSave...");

      onSave(meetingDataAPI);

      console.log("📅 onSave completed successfully");
    } catch (error) {
      console.error("📅 Error in handleSave:", error);
      if (error instanceof Error) {
        toast.error(`Failed to create meeting: ${error.message}`);
      } else {
        toast.error("Failed to create meeting due to invalid date/time values");
      }
    }
  };

  const handleClose = () => {
    setMeetingData({
      title: "",
      startDate: new Date(),
      startTime: { hour: 9, minute: 0, period: "AM" },
      endTime: { hour: 10, minute: 0, period: "AM" },
      participants: [],
      description: "",
      isVirtual: true,
      location: "", // Reset location
    });
    setNewAttendee("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        style={{
          background: "none",
          boxShadow: "none",
          border: "none",
          padding: 0,
        }}
        className="w-full"
      >
        <div style={innerStyle}>
          <img
            src="/model-gradient.png"
            alt="Gradient header"
            style={headerImgStyle}
          />
          <div style={{ padding: "0 32px 24px 32px" }}>
            <div className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <input
                  style={{
                    color: "#303030",
                    fontFamily: "Louize",
                    fontSize: "32px",
                    fontStyle: "normal",
                    fontWeight: "400",
                    lineHeight: "normal",
                  }}
                  placeholder="Meeting Title"
                  value={meetingData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full rounded-none border-0 border-b border-gray-200 px-0 py-2 focus:border-blue-500 focus:ring-0 focus:outline-none"
                />
              </div>

              {/* Date and Time Selection */}
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start rounded-lg border-gray-200 bg-gray-50 text-left font-normal"
                      >
                        {format(meetingData.startDate, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto rounded-lg border border-gray-200 bg-white p-0 shadow-lg"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={meetingData.startDate}
                        onSelect={(date) =>
                          date && handleInputChange("startDate", date)
                        }
                        initialFocus
                        className="rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <TimePicker
                    value={meetingData.startTime}
                    onChange={(time) => handleInputChange("startTime", time)}
                    use12Hour={true}
                  >
                    <Button
                      variant="outline"
                      className="w-24 justify-center rounded-lg border-gray-200 bg-gray-50"
                    >
                      {formatTimeDisplay(meetingData.startTime, true)}
                    </Button>
                  </TimePicker>
                </div>
                <span className="text-gray-500">to</span>
                <TimePicker
                  value={meetingData.endTime}
                  onChange={(time) => handleInputChange("endTime", time)}
                  use12Hour={true}
                >
                  <Button
                    variant="outline"
                    className="w-24 justify-center rounded-lg border-gray-200 bg-gray-50"
                  >
                    {formatTimeDisplay(meetingData.endTime, true)}
                  </Button>
                </TimePicker>
              </div>

              {/* Meeting Type Toggle */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {meetingData.isVirtual ? (
                    <Video className="h-4 w-4 text-blue-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    Meeting Type
                  </span>
                </div>
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => handleInputChange("isVirtual", true)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      meetingData.isVirtual
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Video className="mr-1 inline h-3 w-3" />
                    Virtual
                  </button>
                  <button
                    onClick={() => handleInputChange("isVirtual", false)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      !meetingData.isVirtual
                        ? "bg-white text-green-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <MapPin className="mr-1 inline h-3 w-3" />
                    In-Person
                  </button>
                </div>
              </div>

              {/* Location Input - Only show for in-person meetings */}
              {!meetingData.isVirtual && (
                <div className="space-y-2">
                  <LocationAutocomplete
                    placeholder="Add location (e.g., Office, Home, Conference Room)"
                    value={meetingData.location || ""}
                    onChange={(location) =>
                      handleInputChange("location", location)
                    }
                    className="rounded-lg border-gray-200 bg-gray-50"
                  />
                </div>
              )}

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    Participants
                  </span>
                </div>

                {/* Attendee Input */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Add email address"
                      value={newAttendee}
                      onChange={(e) =>
                        handleAttendeeInputChange(e.target.value)
                      }
                      onKeyPress={handleAttendeeKeyPress}
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <Button
                      onClick={() => addAttendee(newAttendee)}
                      size="sm"
                      className="bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Autocomplete Suggestions */}
                  {showAttendeeSuggestions && (
                    <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {attendeeSuggestions.map((email, index) => (
                        <button
                          key={index}
                          onClick={() => addAttendee(email)}
                          className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attendee Chips */}
                {meetingData.participants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {meetingData.participants.map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => removeAttendee(email)}
                          className="ml-1 hover:text-blue-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a description"
                  value={meetingData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="min-h-[100px] resize-none rounded-lg border-gray-200 bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={!meetingData.title?.trim()}
                >
                  Schedule Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
