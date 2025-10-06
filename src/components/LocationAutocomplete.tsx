import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

import placesAPI from "../helpers/ipc/places/places-api";
import { Input } from "../helpers/ipc/places/input";

// Define PlacePrediction interface locally to avoid importing from services
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}
import { toast } from "sonner";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlacePrediction) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter location",
  className = "",
  disabled = false,
}: LocationAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [sessionToken, setSessionToken] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session token
  useEffect(() => {
    const initSessionToken = async () => {
      try {
        const result = await placesAPI.refreshSessionToken();
        setSessionToken(result.sessionToken);
      } catch (error) {
        console.error("Failed to initialize session token:", error);
      }
    };
    initSessionToken();
  }, []);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!input.trim() || input.length < 2 || !sessionToken) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      setIsLoading(true);
      try {
        const request = {
          input: input,
          sessionToken: sessionToken,
          types: "establishment|geocode",
        };

        const results = await placesAPI.getPlacePredictions(request);
        setPredictions(results);
        setShowPredictions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error fetching predictions:", error);
        setPredictions([]);
        setShowPredictions(false);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionToken],
  );

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce API calls
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPredictions(inputValue);
    }, 300);
  };

  const handlePlaceSelect = (place: PlacePrediction) => {
    onChange(place.description);
    setShowPredictions(false);
    setPredictions([]);
    setSelectedIndex(-1);
    setIsClickingPrediction(false);

    if (onPlaceSelect) {
      onPlaceSelect(place);
    }

    // Focus back to input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPredictions || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handlePlaceSelect(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowPredictions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setShowPredictions(true);
    }
  };

  const [isClickingPrediction, setIsClickingPrediction] = useState(false);

  const handleInputBlur = () => {
    if (isClickingPrediction) return;

    setTimeout(() => {
      setShowPredictions(false);
      setSelectedIndex(-1);
    }, 100);
  };

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Set up error handling
  useEffect(() => {
    const handlePlacesError = (error: string) => {
      console.error("Places error:", error);
      toast.error(`Places Error: ${error}`);
    };

    placesAPI.onPlacesError(handlePlacesError);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10 pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform animate-spin text-gray-400" />
        )}
      </div>

      {/* Predictions Dropdown */}
      {showPredictions && predictions.length > 0 && (
        <div
          ref={predictionsRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onMouseDown={() => setIsClickingPrediction(true)}
              onClick={() => {
                handlePlaceSelect(prediction);
                setIsClickingPrediction(false);
              }}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                index === selectedIndex
                  ? "border-l-2 border-blue-500 bg-blue-50"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900">
                    {prediction.structured_formatting.main_text}
                  </div>
                  {prediction.structured_formatting.secondary_text && (
                    <div className="truncate text-sm text-gray-500">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
