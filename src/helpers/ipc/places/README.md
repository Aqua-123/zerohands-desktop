# Google Maps Places IPC Handlers

This module provides IPC handlers for Google Maps Places API functionality, enabling location autocomplete and place details retrieval in your Electron application.

## Features

- ✅ Place autocomplete/predictions
- ✅ Place details retrieval
- ✅ Session token management
- ✅ Error handling
- ✅ Debounced search requests
- ✅ TypeScript support

## Architecture

The places functionality follows the same pattern as other IPC modules in this repository:

```
src/helpers/ipc/places/
├── places-channels.ts      # IPC channel definitions
├── places-context.ts       # Renderer process context
├── places-listeners.ts     # Main process IPC handlers
├── places-usage-example.ts # Usage examples
└── README.md              # This documentation
```

## Setup

### 1. Environment Variables

Make sure you have the Google Maps API key set in your `.env` file:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Google Cloud Console Setup

1. Enable the following APIs in Google Cloud Console:
   - Places API
   - Places API (New)
   - Geocoding API

2. Create an API key with appropriate restrictions

## Usage

### 1. Import the places context

```typescript
import placesContext from '../helpers/ipc/places/places-context';
```

### 2. Get place predictions (autocomplete)

```typescript
const request = {
  input: "New York",
  sessionToken: "your-session-token",
  types: "establishment|geocode" // Optional
};

const predictions = await placesContext.getPlacePredictions(request);
```

### 3. Get place details

```typescript
const request = {
  placeId: "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  sessionToken: "your-session-token"
};

const placeDetails = await placesContext.getPlaceDetails(request);
```

### 4. Generate session token

```typescript
const result = await placesContext.refreshSessionToken();
const sessionToken = result.sessionToken;
```

## Data Types

### PlacePrediction

```typescript
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}
```

### PlaceDetails

```typescript
interface PlaceDetails {
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
```

### PlacesAutocompleteRequest

```typescript
interface PlacesAutocompleteRequest {
  input: string;
  sessionToken: string;
  types?: string; // Optional: "establishment|geocode", "geocode", etc.
}
```

### PlacesDetailsRequest

```typescript
interface PlacesDetailsRequest {
  placeId: string;
  sessionToken: string;
}
```

## React Component Integration

Here's how to integrate with a React component:

```typescript
import { useState, useEffect, useCallback } from 'react';
import placesContext from '../helpers/ipc/places/places-context';

export function LocationAutocomplete() {
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [sessionToken, setSessionToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session token
  useEffect(() => {
    const initSessionToken = async () => {
      try {
        const result = await placesContext.refreshSessionToken();
        setSessionToken(result.sessionToken);
      } catch (error) {
        console.error('Failed to initialize session token:', error);
      }
    };
    initSessionToken();
  }, []);

  // Debounced search
  const searchPlaces = useCallback(async (searchInput: string) => {
    if (!searchInput.trim() || searchInput.length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const request = {
        input: searchInput,
        sessionToken: sessionToken,
        types: "establishment|geocode"
      };
      
      const results = await placesContext.getPlacePredictions(request);
      setPredictions(results);
    } catch (error) {
      console.error('Error searching places:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  // Debounce the search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlaces(input);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [input, searchPlaces]);

  const handlePlaceSelect = async (prediction) => {
    try {
      const request = {
        placeId: prediction.place_id,
        sessionToken: sessionToken
      };
      
      const placeDetails = await placesContext.getPlaceDetails(request);
      console.log('Selected place:', placeDetails);
      
      // Update input with selected place
      setInput(prediction.description);
      setPredictions([]);
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter location..."
      />
      
      {isLoading && <div>Loading...</div>}
      
      {predictions.length > 0 && (
        <ul>
          {predictions.map((prediction) => (
            <li
              key={prediction.place_id}
              onClick={() => handlePlaceSelect(prediction)}
            >
              {prediction.structured_formatting.main_text}
              {prediction.structured_formatting.secondary_text && (
                <span> - {prediction.structured_formatting.secondary_text}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Error Handling

The places context provides error handling through the `onPlacesError` method:

```typescript
placesContext.onPlacesError((error: string) => {
  console.error("Places error:", error);
  // Show user-friendly error message
  showToast(`Places Error: ${error}`, 'error');
});
```

## Best Practices

1. **Use session tokens**: Always use the same session token for predictions and details requests
2. **Debounce requests**: Implement debouncing to avoid excessive API calls
3. **Handle errors gracefully**: Show user-friendly error messages
4. **Validate input**: Check input length before making API calls
5. **Clean up timeouts**: Clear debounce timeouts on component unmount

## API Limits and Costs

- Google Places API has usage limits and costs
- Autocomplete requests cost more than details requests
- Consider implementing caching for frequently searched locations
- Monitor your API usage in Google Cloud Console

## Examples

See `places-usage-example.ts` for comprehensive usage examples including:
- Basic place search
- Place details retrieval
- Session token management
- Complete workflow examples
- React component integration service

## Dependencies

- `electron` - IPC communication
- Google Maps Places API - External service
- Environment variables for API key management

## Notes

- The service automatically handles API key configuration from environment variables
- Session tokens are used to group related requests for billing purposes
- The service includes proper error handling and logging
- All requests are made from the main process to avoid CORS issues
