import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import "./oauth/oauth-context";
import "./email/email-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
}
