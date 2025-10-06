/**
 * Google Maps Places IPC Usage Examples
 *
 * This file demonstrates how to use the Google Maps Places functionality in the renderer process.
 * Import placesContext and use the methods as shown below.
 */

import placesContext from "./places-context";
import {
  PlacesAutocompleteRequest,
  PlacesDetailsRequest,
  PlacePrediction,
} from "../../../services/places";

// Example: Get place predictions for autocomplete
export async function getPlacePredictionsExample(input: string) {
  try {
    const request: PlacesAutocompleteRequest = {
      input: input,
      sessionToken: "your-session-token", // Generate this using refreshSessionToken()
      types: "establishment|geocode", // Optional: filter by place types
    };

    const predictions = await placesContext.getPlacePredictions(request);
    console.log(`Found ${predictions.length} place predictions`);

    predictions.forEach((prediction) => {
      console.log(
        `- ${prediction.structured_formatting.main_text} (${prediction.structured_formatting.secondary_text})`,
      );
    });

    return predictions;
  } catch (error) {
    console.error("Failed to get place predictions:", error);
    throw error;
  }
}

// Example: Get detailed information about a specific place
export async function getPlaceDetailsExample(placeId: string) {
  try {
    const request: PlacesDetailsRequest = {
      placeId: placeId,
      sessionToken: "your-session-token", // Should be the same as used for predictions
    };

    const placeDetails = await placesContext.getPlaceDetails(request);

    if (placeDetails) {
      console.log(`Place: ${placeDetails.name}`);
      console.log(`Address: ${placeDetails.formatted_address}`);
      console.log(
        `Coordinates: ${placeDetails.geometry.location.lat}, ${placeDetails.geometry.location.lng}`,
      );
      return placeDetails;
    } else {
      console.log("No place details found");
      return null;
    }
  } catch (error) {
    console.error("Failed to get place details:", error);
    throw error;
  }
}

// Example: Generate a new session token
export async function generateSessionTokenExample() {
  try {
    const result = await placesContext.refreshSessionToken();
    console.log("New session token generated:", result.sessionToken);
    return result.sessionToken;
  } catch (error) {
    console.error("Failed to generate session token:", error);
    throw error;
  }
}

// Example: Complete workflow - Search and get place details
export async function searchAndGetPlaceDetailsExample(searchInput: string) {
  try {
    // Step 1: Generate a session token
    const sessionTokenResult = await placesContext.refreshSessionToken();
    const sessionToken = sessionTokenResult.sessionToken;

    // Step 2: Get place predictions
    const predictionsRequest: PlacesAutocompleteRequest = {
      input: searchInput,
      sessionToken: sessionToken,
      types: "establishment|geocode",
    };

    const predictions =
      await placesContext.getPlacePredictions(predictionsRequest);

    if (predictions.length === 0) {
      console.log("No predictions found");
      return null;
    }

    // Step 3: Get details for the first prediction
    const firstPrediction = predictions[0];
    const detailsRequest: PlacesDetailsRequest = {
      placeId: firstPrediction.place_id,
      sessionToken: sessionToken,
    };

    const placeDetails = await placesContext.getPlaceDetails(detailsRequest);

    console.log("Search completed successfully");
    return {
      predictions: predictions,
      selectedPlace: placeDetails,
    };
  } catch (error) {
    console.error("Failed to search and get place details:", error);
    throw error;
  }
}

// Example: Set up error handling
export function setupPlacesErrorHandling() {
  placesContext.onPlacesError((error: string) => {
    console.error("Places error:", error);
    // You can show a toast notification or update UI state here
    // For example: showToast(`Places Error: ${error}`, 'error');
  });
}

// Example: Location autocomplete component integration
export class LocationAutocompleteService {
  private sessionToken: string = "";
  private debounceTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSessionToken();
  }

  private async initializeSessionToken() {
    try {
      const result = await placesContext.refreshSessionToken();
      this.sessionToken = result.sessionToken;
    } catch (error) {
      console.error("Failed to initialize session token:", error);
    }
  }

  async searchPlaces(
    input: string,
    callback: (predictions: PlacePrediction[]) => void,
  ) {
    // Clear previous timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce API calls
    this.debounceTimeout = setTimeout(async () => {
      if (!input.trim() || input.length < 2) {
        callback([]);
        return;
      }

      try {
        const request: PlacesAutocompleteRequest = {
          input: input,
          sessionToken: this.sessionToken,
          types: "establishment|geocode",
        };

        const predictions = await placesContext.getPlacePredictions(request);
        callback(predictions);
      } catch (error) {
        console.error("Error searching places:", error);
        callback([]);
      }
    }, 300);
  }

  async getPlaceDetails(placeId: string) {
    try {
      const request: PlacesDetailsRequest = {
        placeId: placeId,
        sessionToken: this.sessionToken,
      };

      return await placesContext.getPlaceDetails(request);
    } catch (error) {
      console.error("Error getting place details:", error);
      return null;
    }
  }

  async refreshSessionToken() {
    try {
      const result = await placesContext.refreshSessionToken();
      this.sessionToken = result.sessionToken;
      return this.sessionToken;
    } catch (error) {
      console.error("Error refreshing session token:", error);
      throw error;
    }
  }

  cleanup() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }
}
