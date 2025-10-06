import { ipcMain, BrowserWindow } from "electron";
import {
  GoogleMapsPlacesService,
  PlacesAutocompleteRequest,
  PlacesDetailsRequest,
} from "../../../services/places";
import { PLACES_CHANNELS } from "./places-channels";

let placesService: GoogleMapsPlacesService;

export function registerPlacesListeners(mainWindow: BrowserWindow) {
  placesService = new GoogleMapsPlacesService();

  // Get place predictions
  ipcMain.handle(
    PLACES_CHANNELS.GET_PLACE_PREDICTIONS,
    async (_, request: PlacesAutocompleteRequest) => {
      try {
        console.log(
          `[IPC_PLACES] Received GET_PLACE_PREDICTIONS request for input: ${request.input}`,
        );

        const result = await placesService.getPlacePredictions(request);
        console.log(
          `[IPC_PLACES] Successfully retrieved ${result.length} place predictions`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to get place predictions";
        console.error(`[IPC_PLACES] Error in GET_PLACE_PREDICTIONS:`, error);
        mainWindow.webContents.send(PLACES_CHANNELS.PLACES_ERROR, errorMessage);
        throw error;
      }
    },
  );

  // Get place details
  ipcMain.handle(
    PLACES_CHANNELS.GET_PLACE_DETAILS,
    async (_, request: PlacesDetailsRequest) => {
      try {
        console.log(
          `[IPC_PLACES] Received GET_PLACE_DETAILS request for placeId: ${request.placeId}`,
        );

        const result = await placesService.getPlaceDetails(request);
        console.log(
          `[IPC_PLACES] Successfully retrieved place details for: ${result?.name || "unknown"}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to get place details";
        console.error(`[IPC_PLACES] Error in GET_PLACE_DETAILS:`, error);
        mainWindow.webContents.send(PLACES_CHANNELS.PLACES_ERROR, errorMessage);
        throw error;
      }
    },
  );

  // Generate new session token
  ipcMain.handle(PLACES_CHANNELS.REFRESH_SESSION_TOKEN, async () => {
    try {
      console.log(`[IPC_PLACES] Received REFRESH_SESSION_TOKEN request`);

      const sessionToken = placesService.generateSessionToken();
      console.log(`[IPC_PLACES] Successfully generated new session token`);
      return { sessionToken };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate session token";
      console.error(`[IPC_PLACES] Error in REFRESH_SESSION_TOKEN:`, error);
      mainWindow.webContents.send(PLACES_CHANNELS.PLACES_ERROR, errorMessage);
      throw error;
    }
  });

  console.log(`[IPC_PLACES] Places listeners registered successfully`);
}
