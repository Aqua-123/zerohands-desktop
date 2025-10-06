import { contextBridge, ipcRenderer } from "electron";
import { PLACES_CHANNELS } from "./places-channels";
import {
  PlacePrediction,
  PlaceDetails,
  PlacesAutocompleteRequest,
  PlacesDetailsRequest,
} from "../../../services/places";

export interface PlacesContext {
  // Place predictions
  getPlacePredictions: (
    request: PlacesAutocompleteRequest,
  ) => Promise<PlacePrediction[]>;

  // Place details
  getPlaceDetails: (
    request: PlacesDetailsRequest,
  ) => Promise<PlaceDetails | null>;

  // Session token management
  refreshSessionToken: () => Promise<{ sessionToken: string }>;

  // Error handling
  onPlacesError: (callback: (error: string) => void) => void;
}

const placesContext: PlacesContext = {
  // Place predictions
  getPlacePredictions: (request: PlacesAutocompleteRequest) =>
    ipcRenderer.invoke(PLACES_CHANNELS.GET_PLACE_PREDICTIONS, request),

  // Place details
  getPlaceDetails: (request: PlacesDetailsRequest) =>
    ipcRenderer.invoke(PLACES_CHANNELS.GET_PLACE_DETAILS, request),

  // Session token management
  refreshSessionToken: () =>
    ipcRenderer.invoke(PLACES_CHANNELS.REFRESH_SESSION_TOKEN),

  // Error handling
  onPlacesError: (callback: (error: string) => void) => {
    ipcRenderer.on(PLACES_CHANNELS.PLACES_ERROR, (_, error: string) => {
      callback(error);
    });
  },
};

contextBridge.exposeInMainWorld("places", placesContext);

export default placesContext;
