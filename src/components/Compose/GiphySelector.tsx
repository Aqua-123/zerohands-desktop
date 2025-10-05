"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GiphyItem {
  id: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    downsized: {
      url: string;
      width: string;
      height: string;
    };
  };
  title: string;
  alt_text: string;
}

interface GiphySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

const GIPHY_API_KEY =
  import.meta.env.VITE_GIPHY_API_KEY || "b9Rw14UnCc9KH2ZXbEfnHEspuPfjpBbf";
const GIPHY_BASE_URL = "https://api.giphy.com/v1";

export default function GiphySelector({
  isOpen,
  onClose,
  onSelect,
}: GiphySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"trending" | "search" | "emoji">(
    "trending",
  );

  // Fetch trending GIFs when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchTrendingGifs();
    }
  }, [isOpen]);

  const fetchTrendingGifs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_BASE_URL}/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`,
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Error fetching trending GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchGifs = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_BASE_URL}/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`,
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Error searching GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmojis = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_BASE_URL}/emoji?api_key=${GIPHY_API_KEY}&limit=20`,
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Error fetching emojis:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveTab("search");
      fetchSearchGifs(searchTerm);
    }
  };

  const handleTabChange = (tab: "trending" | "search" | "emoji") => {
    setActiveTab(tab);
    if (tab === "trending") {
      fetchTrendingGifs();
    } else if (tab === "emoji") {
      fetchEmojis();
    }
  };

  const handleGifSelect = (gif: GiphyItem) => {
    onSelect(gif.images.downsized.url);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add GIF or Emoji</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search for GIFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => handleTabChange("trending")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "trending"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => handleTabChange("emoji")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "emoji"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Emojis
            </button>
            {activeTab === "search" && (
              <button className="border-b-2 border-blue-500 px-4 py-2 text-sm font-medium text-blue-600">
                Search Results
              </button>
            )}
          </div>

          {/* GIF Grid */}
          <div className="max-h-96 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {gifs.map((gif) => (
                  <div
                    key={gif.id}
                    className="relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-80"
                    onClick={() => handleGifSelect(gif)}
                  >
                    <img
                      src={gif.images.fixed_height.url}
                      alt={gif.alt_text || gif.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {!loading && gifs.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                No GIFs found. Try a different search term.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
