import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import { Clock } from "lucide-react";

type Period = "AM" | "PM";

export type Time = {
  hour: number; // 0–23 if use12Hour=false, 1–12 if use12Hour=true
  minute: number; // 0–59
  period?: Period; // required when use12Hour=true
};

export type TimePickerProps = {
  children: React.ReactNode; // trigger element (e.g., a button, text, etc.)
  value?: Time; // controlled
  defaultValue?: Time; // uncontrolled
  onChange?: (time: Time) => void;
  use12Hour?: boolean;
  okText?: string;
  cancelText?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/**
 * Floating TimePicker
 * - Anchors to its trigger using a Popover.
 * - Keeps a draft while open. Applies on OK, discards on Cancel.
 * - Works controlled (value) or uncontrolled (defaultValue).
 */
export function TimePicker({
  children,
  value,
  defaultValue,
  onChange,
  use12Hour = false,
  okText = "OK",
  cancelText = "Cancel",
  side = "bottom",
  align = "start",
  onOpenChange,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;

  const [uncontrolled, setUncontrolled] = React.useState<Time>(() => {
    if (defaultValue) return sanitizeTime(defaultValue, use12Hour);
    // default to current time (rounded to nearest 5 minutes)
    const now = new Date();
    const rounded = new Date(
      Math.round(now.getTime() / (5 * 60_000)) * (5 * 60_000),
    );
    const h24 = rounded.getHours();
    const m = rounded.getMinutes();
    if (use12Hour) {
      const { hour, period } = to12Hour(h24);
      return { hour, minute: m, period };
    }
    return { hour: h24, minute: m };
  });

  const current = React.useMemo(
    () =>
      sanitizeTime(isControlled ? (value as Time) : uncontrolled, use12Hour),
    [isControlled, value, uncontrolled, use12Hour],
  );

  const [draft, setDraft] = React.useState<Time>(current);

  React.useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const handleOk = () => {
    if (isControlled) {
      onChange?.(draft);
    } else {
      setUncontrolled(draft);
      onChange?.(draft);
    }
    handleOpenChange(false);
  };

  const handleCancel = () => {
    setDraft(current);
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn(
          "bg-popover text-popover-foreground w-[360px] rounded-2xl p-4 shadow-lg md:p-5",
          className,
        )}
      >
        <div className="space-y-4 md:space-y-5">
          <h3 className="text-muted-foreground text-sm font-medium">
            Enter time
          </h3>

          <TimeEditor value={draft} use12Hour={use12Hour} onChange={setDraft} />

          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden />
              <span className="sr-only">Time Picker</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="px-3" onClick={handleCancel}>
                {cancelText}
              </Button>
              <Button className="px-4" onClick={handleOk}>
                {okText}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Internal UI ---------------- */

function TimeEditor({
  value,
  use12Hour,
  onChange,
}: {
  value: Time;
  use12Hour: boolean;
  onChange: (t: Time) => void;
}) {
  const hourRef = React.useRef<HTMLInputElement>(null);
  const minuteRef = React.useRef<HTMLInputElement>(null);

  const setHour = (raw: string) => {
    // If raw is empty, set hour to 0
    if (raw === "") {
      onChange({ ...value, hour: use12Hour ? 12 : 0 });
      return;
    }
    // Parse the raw string to get the numeric value
    const n = parseNumeric(raw);
    // Clamp to valid range
    const clampedHour = clampHour(n, use12Hour);
    onChange({ ...value, hour: clampedHour });
  };

  const setMinute = (raw: string) => {
    // If raw is empty, set minute to 0
    if (raw === "") {
      onChange({ ...value, minute: 0 });
      return;
    }
    // Parse the raw string to get the numeric value
    const n = parseNumeric(raw);
    // Clamp to valid range
    const clampedMinute = clamp(n, 0, 59);
    onChange({ ...value, minute: clampedMinute });
  };

  const onHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? 1 : -1;
      const next = use12Hour
        ? cycle(value.hour, 1, 12, delta)
        : cycle(value.hour, 0, 23, delta);
      onChange({ ...value, hour: next });
    }
    if (e.key === ":" || e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
  };

  const onMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? 1 : -1;
      const next = cycle(value.minute, 0, 59, delta);
      onChange({ ...value, minute: next });
    }
  };

  return (
    <div className="flex w-72 items-center gap-4">
      <Field label="Hour" className="flex-1">
        <NumericBox
          ref={hourRef}
          aria-label="Hour"
          value={format2(value.hour)}
          onChange={setHour}
          onKeyDown={onHourKeyDown}
        />
      </Field>

      <div
        className="text-muted-foreground text-3xl font-semibold select-none md:text-4xl"
        aria-hidden
      >
        :
      </div>

      <Field label="Minute" className="flex-1">
        <NumericBox
          ref={minuteRef}
          aria-label="Minute"
          value={format2(value.minute)}
          onChange={setMinute}
          onKeyDown={onMinuteKeyDown}
        />
      </Field>

      {use12Hour && (
        <div className="flex flex-col">
          <Segmented
            value={value.period ?? "AM"}
            onChange={(p) => onChange({ ...value, period: p })}
            options={[
              { value: "AM", label: "AM" },
              { value: "PM", label: "PM" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

const NumericBox = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (raw: string) => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
    "aria-label"?: string;
  }
>(({ value, onChange, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(value);
  const [isFocused, setIsFocused] = React.useState(false);

  // Update local value when prop value changes (but not when focused)
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow empty string, single digit, or two digits (including leading zeros)
    if (inputValue === "" || /^\d{1,2}$/.test(inputValue)) {
      setLocalValue(inputValue);
      onChange(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, arrow keys, tab, enter
    if (
      [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Tab",
        "Enter",
      ].includes(e.key)
    ) {
      return;
    }
    // Allow only digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
    // Call the original onKeyDown if provided
    props.onKeyDown?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.currentTarget.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    // When losing focus, update local value to the formatted value
    setLocalValue(value);
  };

  return (
    <input
      ref={ref}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "w-full rounded-xl border bg-[#DDE4FF] px-3 py-3 md:px-4 md:py-4",
        "ring-offset-background outline-none focus-visible:border-[#3d8efe] focus-visible:ring-2 focus-visible:ring-[#3d8efe]",
        "font-louize text-center text-3xl tabular-nums focus:text-[#3d8efe] md:text-5xl",
      )}
      {...props}
    />
  );
});
NumericBox.displayName = "NumericBox";

function Segmented({
  value,
  onChange,
  options,
}: {
  value: Period;
  onChange: (v: Period) => void;
  options: { value: Period; label: string }[];
}) {
  const idx = options.findIndex((o) => o.value === value);
  const move = (delta: number) => {
    const nextIndex =
      (((idx + delta) % options.length) + options.length) % options.length;
    onChange(options[nextIndex].value);
  };

  return (
    <div
      className="bg-muted/30 flex flex-col overflow-hidden rounded-xl border"
      role="tablist"
      aria-orientation="vertical"
      aria-label="AM or PM"
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "focus-visible:ring-ring font-roboto w-16 cursor-pointer px-3 py-2 text-sm text-[#5B3B63] outline-none focus-visible:ring-2",
              i === 0 ? "border-b" : "",
              active ? "bg-[#ffd8fe]" : "bg-[#ece6f0]",
            )}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              }
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onChange(opt.value);
              }
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Helpers & Exports ---------------- */

function parseNumeric(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number.parseInt(digits.slice(0, 2), 10) : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function clampHour(n: number, use12Hour: boolean) {
  return use12Hour ? clamp(n || 0, 1, 12) : clamp(n, 0, 23);
}

function cycle(n: number, min: number, max: number, delta: number) {
  const size = max - min + 1;
  return ((((n - min + delta) % size) + size) % size) + min;
}

function format2(n: number) {
  return String(n).padStart(2, "0");
}

function to12Hour(h24: number): { hour: number; period: Period } {
  const period: Period = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12;
  return { hour: h === 0 ? 12 : h, period };
}

function sanitizeTime(t: Time | undefined, use12Hour: boolean): Time {
  if (!t)
    return use12Hour
      ? { hour: 12, minute: 0, period: "AM" }
      : { hour: 0, minute: 0 };
  const minute = clamp(t.minute ?? 0, 0, 59);
  if (use12Hour) {
    return {
      hour: clampHour(t.hour ?? 12, true),
      minute,
      period: t.period ?? "AM",
    };
  }
  return { hour: clampHour(t.hour ?? 0, false), minute };
}

// Convert 24-hour time to 12-hour format
export function to12HourTime(hour24: number): { hour: number; period: Period } {
  const period: Period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12;
  return { hour: hour === 0 ? 12 : hour, period };
}

// Convert 12-hour time to 24-hour format
export function to24HourTime(hour12: number, period: Period): number {
  const base = hour12 % 12;
  return period === "PM" ? base + 12 : base;
}

export function formatTimeDisplay(t: Time, use12Hour: boolean) {
  if (use12Hour) {
    return `${format2(t.hour)}:${format2(t.minute)} ${t.period ?? "AM"}`;
  }
  // For 24-hour display, convert from 12-hour if needed
  const hh = t.period ? to24HourTime(t.hour, t.period) : t.hour;
  return `${format2(hh)}:${format2(t.minute)}`;
}
