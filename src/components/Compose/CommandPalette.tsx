import React, { useState, useEffect, useRef } from "react";
import {
  Type,
  Image,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Zap,
  Smile,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSlashCommand: (command: string, value?: string) => void;
  onQuickSnippet: (text: string) => void;
  mode: "slash" | "snippets";
}

interface SlashCommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  command: string;
  value?: string;
  keywords: string[];
}

interface QuickSnippet {
  id: string;
  label: string;
  icon: React.ReactNode;
  text: string;
  category: string;
  keywords: string[];
}

const headerImgStyle: React.CSSProperties = {
  width: "100%",
  height: 60,
  objectFit: "cover",
  borderTopLeftRadius: 15,
  borderTopRightRadius: 15,
  marginBottom: 0,
  display: "block",
};

const innerStyle: React.CSSProperties = {
  borderRadius: 15,
  background: "#FFF",
  minWidth: 580,
  maxWidth: 580,
  margin: "0 auto",
  boxShadow: "0px 4px 46.9px 0px rgba(104, 104, 104, 0.15)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 20,
  padding: "10px 0",
  borderRadius: 8,
  marginBottom: 24,
  outline: "none",
  fontFamily: "inherit",
  background: "transparent",
};

const optionStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 18,
  padding: "12px",
  borderRadius: 15,
  color: active ? "#3D8EFE" : "#222",
  background: active ? "rgba(61,142,254,0.07)" : "transparent",
  cursor: "pointer",
  border: "none",
  width: "100%",
});

const keyStyle: React.CSSProperties = {
  display: "inline-block",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 15,
  marginLeft: 8,
  background: "#fafbfc",
  color: "#888",
};

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "text",
    label: "Text",
    icon: <Type className="h-4 w-4" />,
    description: "Continue with plain text",
    command: "text",
    keywords: ["text", "paragraph", "normal"],
  },
  {
    id: "image",
    label: "Image",
    icon: <Image className="h-4 w-4" />,
    description: "Upload an image",
    command: "image",
    keywords: ["image", "picture", "photo", "upload"],
  },
  {
    id: "heading1",
    label: "Heading 1",
    icon: <Heading1 className="h-4 w-4" />,
    description: "Big section heading",
    command: "formatBlock",
    value: "h1",
    keywords: ["heading", "h1", "title", "large"],
  },
  {
    id: "heading2",
    label: "Heading 2",
    icon: <Heading2 className="h-4 w-4" />,
    description: "Medium section heading",
    command: "formatBlock",
    value: "h2",
    keywords: ["heading", "h2", "subtitle", "medium"],
  },
  {
    id: "heading3",
    label: "Heading 3",
    icon: <Heading3 className="h-4 w-4" />,
    description: "Small section heading",
    command: "formatBlock",
    value: "h3",
    keywords: ["heading", "h3", "small"],
  },
  {
    id: "bulletList",
    label: "Bullet List",
    icon: <List className="h-4 w-4" />,
    description: "Create a bullet list",
    command: "insertUnorderedList",
    keywords: ["list", "bullet", "unordered", "ul"],
  },
  {
    id: "numberedList",
    label: "Numbered List",
    icon: <ListOrdered className="h-4 w-4" />,
    description: "Create a numbered list",
    command: "insertOrderedList",
    keywords: ["list", "numbered", "ordered", "ol"],
  },
  {
    id: "divider",
    label: "Divider",
    icon: <Minus className="h-4 w-4" />,
    description: "Add a divider line",
    command: "insertDivider",
    keywords: ["divider", "separator", "line", "hr"],
  },
  {
    id: "gif",
    label: "GIF",
    icon: <Smile className="h-4 w-4" />,
    description: "Insert a GIF from Giphy",
    command: "insertGif",
    keywords: ["gif", "giphy", "animation", "funny", "meme"],
  },
];

const QUICK_SNIPPETS: QuickSnippet[] = [
  {
    id: "lookForward",
    label: "I look forward to your response",
    icon: <Zap className="h-4 w-4" />,
    text: "I look forward to your response.",
    category: "Closing",
    keywords: ["looking forward", "response", "reply", "closing"],
  },
  {
    id: "hopeYouWell",
    label: "I hope you will look into the matter at the earliest",
    icon: <Zap className="h-4 w-4" />,
    text: "I hope you will look into the matter at the earliest.",
    category: "Request",
    keywords: ["earliest", "matter", "hope", "urgent"],
  },
  {
    id: "thanksAdvance",
    label: "Thank you in advance",
    icon: <Zap className="h-4 w-4" />,
    text: "Thank you in advance for your time and consideration.",
    category: "Closing",
    keywords: ["thanks", "advance", "tia", "gratitude"],
  },
  {
    id: "followUp",
    label: "Following up on this matter",
    icon: <Zap className="h-4 w-4" />,
    text: "I am following up on this matter to ensure we stay on track.",
    category: "Follow-up",
    keywords: ["follow up", "followup", "matter", "tracking"],
  },
  {
    id: "schedule",
    label: "Please let me know when you are available",
    icon: <Zap className="h-4 w-4" />,
    text: "Please let me know when you are available to discuss this further.",
    category: "Scheduling",
    keywords: ["available", "schedule", "discuss", "meeting"],
  },
  {
    id: "urgent",
    label: "This is urgent",
    icon: <Zap className="h-4 w-4" />,
    text: "This is urgent and requires immediate attention.",
    category: "Priority",
    keywords: ["urgent", "immediate", "asap", "priority"],
  },
  {
    id: "bestRegards",
    label: "Best regards",
    icon: <Zap className="h-4 w-4" />,
    text: "Best regards,",
    category: "Closing",
    keywords: ["best regards", "regards", "br", "closing"],
  },
  {
    id: "kindly",
    label: "Kindly confirm receipt",
    icon: <Zap className="h-4 w-4" />,
    text: "Kindly confirm receipt of this email.",
    category: "Request",
    keywords: ["kindly", "confirm", "receipt", "acknowledgment"],
  },
  {
    id: "attachments",
    label: "Please find attached",
    icon: <Zap className="h-4 w-4" />,
    text: "Please find the attached documents for your review.",
    category: "Reference",
    keywords: ["pfa", "attached", "find attached", "documents"],
  },
  {
    id: "apologies",
    label: "I apologize for the delay",
    icon: <Zap className="h-4 w-4" />,
    text: "I apologize for the delay in getting back to you.",
    category: "Apology",
    keywords: ["apologize", "delay", "sorry", "apology"],
  },
];

const SUGGESTION_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSlashCommand,
  onQuickSnippet,
  mode,
}) => {
  const [input, setInput] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<
    (SlashCommandItem | QuickSnippet)[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === "slash") {
      const filtered = input.trim()
        ? SLASH_COMMANDS.filter(
            (cmd) =>
              cmd.label.toLowerCase().includes(input.toLowerCase()) ||
              cmd.description.toLowerCase().includes(input.toLowerCase()) ||
              cmd.keywords.some((kw) =>
                kw.toLowerCase().includes(input.toLowerCase()),
              ),
          )
        : SLASH_COMMANDS;
      setFilteredOptions(filtered.slice(0, 5));
    } else {
      const filtered = input.trim()
        ? QUICK_SNIPPETS.filter(
            (snippet) =>
              snippet.label.toLowerCase().includes(input.toLowerCase()) ||
              snippet.text.toLowerCase().includes(input.toLowerCase()) ||
              snippet.keywords.some((kw) =>
                kw.toLowerCase().includes(input.toLowerCase()),
              ),
          )
        : QUICK_SNIPPETS;
      setFilteredOptions(filtered.slice(0, 5));
    }
    setActiveIdx(0);
  }, [input, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      setActiveIdx((i) => Math.min(i + 1, filteredOptions.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIdx((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      const selected = filteredOptions[activeIdx];
      if (selected) {
        if (mode === "slash" && "command" in selected) {
          onSlashCommand(selected.command, selected.value);
        } else if (mode === "snippets" && "text" in selected) {
          onQuickSnippet(selected.text);
        }
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    } else if (/^[1-9]$/.test(e.key) && input.trim() === "") {
      const idx = parseInt(e.key, 10) - 1;
      const selected = filteredOptions[idx];
      if (selected) {
        if (mode === "slash" && "command" in selected) {
          onSlashCommand(selected.command, selected.value);
        } else if (mode === "snippets" && "text" in selected) {
          onQuickSnippet(selected.text);
        }
        onClose();
      }
    }
  };

  const handleOptionClick = (option: SlashCommandItem | QuickSnippet) => {
    if (mode === "slash" && "command" in option) {
      onSlashCommand(option.command, option.value);
    } else if (mode === "snippets" && "text" in option) {
      onQuickSnippet(option.text);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        style={{
          background: "none",
          boxShadow: "none",
          border: "none",
          padding: 0,
        }}
      >
        <div style={innerStyle}>
          <img
            src="/model-gradient.png"
            alt="Gradient header"
            style={headerImgStyle}
          />
          <div style={{ padding: "0 32px 24px 32px" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "#888",
                marginBottom: 8,
                marginTop: 8,
              }}
            >
              {mode === "slash" ? "Insert Block" : "Quick Snippets"}
            </div>
            <input
              ref={inputRef}
              style={inputStyle}
              placeholder={
                mode === "slash"
                  ? "Type to search blocks..."
                  : "Type to search snippets..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={
                mode === "slash" ? "Search blocks" : "Search snippets"
              }
            />
            <div
              style={{ borderTop: "1px solid #e5e7eb", margin: "8px 0 0 0" }}
            />
            <div style={{ marginTop: 8 }}>
              {filteredOptions.map((option, i) => (
                <button
                  key={option.id}
                  style={optionStyle(i === activeIdx)}
                  tabIndex={-1}
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleOptionClick(option)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      textAlign: "left",
                    }}
                  >
                    {option.icon}
                    <div>
                      <div style={{ fontWeight: 500 }}>{option.label}</div>
                      <div
                        style={{ fontSize: 15, color: "#888", marginTop: 2 }}
                      >
                        {mode === "slash" && "description" in option
                          ? option.description
                          : "text" in option
                            ? option.text
                            : ""}
                      </div>
                    </div>
                  </div>
                  <span style={keyStyle}>{SUGGESTION_KEYS[i]}</span>
                </button>
              ))}
              {input && filteredOptions.length === 0 && (
                <div
                  style={{
                    color: "#e57373",
                    fontSize: 15,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  No {mode === "slash" ? "blocks" : "snippets"} found for &apos;
                  {input}&apos;
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
