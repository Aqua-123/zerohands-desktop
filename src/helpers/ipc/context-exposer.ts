import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import "./oauth/oauth-context";
import "./email/email-context";
import "./calendar/calendar-context";
import "./places/places-context";
import { exposeOnboardingContext } from "./onboarding/onboarding-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOnboardingContext();
}
