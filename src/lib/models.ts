import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// const baseURL = 'http://192.168.0.175:9000/v1';
const actualURL = "https://glm_model.futurixai.com/v1";

const ShivaayProvider = createOpenAICompatible({
  name: "Shivaay",
  apiKey: "FuckyWucky",
  baseURL: actualURL,
});

const shivaayModel = ShivaayProvider("zerohands");

export { ShivaayProvider, shivaayModel };
