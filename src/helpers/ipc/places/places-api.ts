// Renderer-safe API for places functionality
// This file should be imported in renderer components instead of places-context.ts

import {
  PlacePrediction,
  PlaceDetails,
  PlacesAutocompleteRequest,
  PlacesDetailsRequest,
} from "../../../services/places";

export interface PlacesAPI {
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

// Access the places API exposed by the preload script
const placesAPI: PlacesAPI = (window as any).places;

if (!placesAPI) {
  console.error(
    "Places API not available. Make sure the preload script is loaded.",
  );
}

export default placesAPI;
