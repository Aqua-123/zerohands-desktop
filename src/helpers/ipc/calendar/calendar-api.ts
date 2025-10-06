import { CalendarContext } from "@/types";

const calendarAPI: CalendarContext = window.calendar;

if (!calendarAPI) {
  console.error(
    "Calendar API not available. Make sure the preload script is loaded.",
  );
}

export default calendarAPI;
