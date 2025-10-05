import { generateText } from "ai";
import { shivaayModel } from "./models";
import { LabelsSystemPrompt } from "./prompts/labels";

export async function generateLabels(
  subject: string,
  email: string,
): Promise<string[]> {
  const maxRetries = 5;
  let attempts = 0;
  let labels: string[] = [];

  while (attempts < maxRetries) {
    attempts++;

    const response = await generateText({
      model: shivaayModel,
      system: LabelsSystemPrompt,
      prompt: `email: ${subject} ${email}`,
      temperature: 0.7, // Keep user's change
    });

    try {
      const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*?\})/;
      const match = response.text.match(jsonRegex);

      let jsonString: string;

      if (match) {
        jsonString = match[1] || match[2];
      } else {
        jsonString = response.text.trim();
      }

      const parsed = JSON.parse(jsonString);

      // Validate that the parsed object has the expected structure
      if (parsed && parsed.labels && Array.isArray(parsed.labels)) {
        labels = parsed.labels;
        break; // Success, exit loop
      } else {
        throw new Error("Invalid JSON structure: missing labels array");
      }
    } catch (error) {
      console.log(`Attempt ${attempts} failed to parse JSON:`, error);
      if (attempts >= maxRetries) {
        throw new Error(
          `Failed to get valid JSON after ${maxRetries} attempts`,
        );
      }
      // Continue the loop to retry
    }
  }

  return labels;
}
