import { DatabaseService } from "./database";

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface PlacesAutocompleteRequest {
  input: string;
  sessionToken: string;
  types?: string;
}

export interface PlacesDetailsRequest {
  placeId: string;
  sessionToken: string;
}

export class GoogleMapsPlacesService {
  private databaseService: DatabaseService;
  private apiKey: string;

  constructor() {
    this.databaseService = new DatabaseService();
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
  }

  async getPlacePredictions(
    request: PlacesAutocompleteRequest,
  ): Promise<PlacePrediction[]> {
    try {
      console.log(
        `[PLACES_SERVICE] Getting place predictions for input: ${request.input}`,
      );

      if (!this.apiKey) {
        console.warn("Google Maps API key not configured");
        return [];
      }

      if (!request.input.trim()) {
        return [];
      }

      const types = request.types || "establishment|geocode";
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        request.input,
      )}&sessiontoken=${request.sessionToken}&types=${types}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        console.log(
          `[PLACES_SERVICE] Successfully retrieved ${data.predictions?.length || 0} place predictions`,
        );
        return data.predictions || [];
      } else {
        console.warn(
          "Google Places API error:",
          data.status,
          data.error_message,
        );
        return [];
      }
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      throw new Error(
        `Failed to fetch place predictions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getPlaceDetails(
    request: PlacesDetailsRequest,
  ): Promise<PlaceDetails | null> {
    try {
      console.log(
        `[PLACES_SERVICE] Getting place details for placeId: ${request.placeId}`,
      );

      if (!this.apiKey) {
        console.warn("Google Maps API key not configured");
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${request.placeId}&sessiontoken=${request.sessionToken}&fields=place_id,formatted_address,name,geometry&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        console.log(
          `[PLACES_SERVICE] Successfully retrieved place details for: ${data.result.name}`,
        );
        return data.result;
      } else {
        console.warn(
          "Google Places Details API error:",
          data.status,
          data.error_message,
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      throw new Error(
        `Failed to fetch place details: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  generateSessionToken(): string {
    return this.generateSessionToken();
  }
}
