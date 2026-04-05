"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ThemedSelectOption = {
  label: string;
  value: string;
};

type ThemedSelectProps = {
  disabled?: boolean;
  onValueChange: (value: string) => void;
  options: readonly ThemedSelectOption[];
  placeholder: string;
  value: string;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

function clampIndex(index: number, max: number) {
  if (max <= 0) return -1;
  if (index < 0) return 0;
  if (index > max - 1) return max - 1;
  return index;
}

export default function ThemedSelect({
  disabled = false,
  onValueChange,
  options,
  placeholder,
  value,
}: ThemedSelectProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    selectedIndex >= 0 ? selectedIndex : 0,
  );

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const nextTop = rect.bottom + 10;
    const maxWidth = Math.min(rect.width, window.innerWidth - 24);

    setMenuPosition({
      left: Math.min(rect.left, window.innerWidth - maxWidth - 12),
      top: Math.min(nextTop, window.innerHeight - 16),
      width: maxWidth,
    });

    const frame = window.requestAnimationFrame(() => {
      listboxRef.current?.focus();
      optionRefs.current[clampIndex(highlightedIndex, options.length)]?.scrollIntoView({
        block: "nearest",
      });
    });

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || listboxRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleWindowChange = () => {
      setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [highlightedIndex, open, options.length]);

  function toggleOpen() {
    if (disabled) return;
    setOpen((current) => {
      if (!current) {
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }

      return !current;
    });
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectValue(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveHighlight(direction: 1 | -1) {
    setHighlightedIndex((current) => {
      const fallback = selectedIndex >= 0 ? selectedIndex : 0;
      const start = current >= 0 ? current : fallback;
      const next = clampIndex(start + direction, options.length);
      optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
      return next;
    });
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
        setOpen(true);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        toggleOpen();
        break;
      default:
        break;
    }
  }

  function handleListboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        event.preventDefault();
        setHighlightedIndex(0);
        optionRefs.current[0]?.scrollIntoView({ block: "nearest" });
        break;
      case "End": {
        event.preventDefault();
        const lastIndex = options.length - 1;
        setHighlightedIndex(lastIndex);
        optionRefs.current[lastIndex]?.scrollIntoView({ block: "nearest" });
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        if (highlightedIndex >= 0) {
          selectValue(options[highlightedIndex].value);
        }
        break;
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const menu =
    open && typeof document !== "undefined" && menuPosition
      ? createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
            }
            onKeyDown={handleListboxKeyDown}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: "min(320px, calc(100vh - 32px))",
              overflowY: "auto",
              padding: 8,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(24,24,28,0.98) 0%, rgba(18,18,22,0.98) 100%)",
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              zIndex: 1000,
              outline: "none",
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value || "__empty"}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectValue(option.value)}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "none",
                    background: isSelected
                      ? "rgba(194,122,92,0.16)"
                      : isHighlighted
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                    color: isSelected
                      ? "rgba(244,244,245,0.96)"
                      : isHighlighted
                        ? "rgba(244,244,245,0.86)"
                        : "rgba(161,161,170,0.72)",
                    fontSize: 14,
                    fontWeight: isSelected ? 700 : 600,
                    lineHeight: 1.35,
                    letterSpacing: "-0.01em",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background 0.18s ease, color 0.18s ease",
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(194,122,92,0.92)",
                        boxShadow: "0 0 10px rgba(194,122,92,0.35)",
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        style={{
          width: "100%",
          minHeight: 48,
          borderRadius: 14,
          border: open
            ? "1px solid rgba(194,122,92,0.42)"
            : "1px solid rgba(255,255,255,0.09)",
          background: open ? "rgba(194,122,92,0.08)" : "rgba(24,24,27,0.66)",
          color: selectedOption ? "var(--text)" : "var(--muted)",
          padding: "0 14px",
          fontSize: 14,
          lineHeight: 1.2,
          outline: "none",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          boxShadow: open ? "0 0 0 3px rgba(194,122,92,0.10)" : "none",
          transition: "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selectedOption ? "rgba(244,244,245,0.9)" : "rgba(161,161,170,0.55)",
            fontWeight: selectedOption ? 650 : 500,
          }}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRight: "1.5px solid currentColor",
            borderBottom: "1.5px solid currentColor",
            color: open ? "rgba(194,122,92,0.92)" : "rgba(161,161,170,0.52)",
            transform: open ? "rotate(-135deg)" : "rotate(45deg)",
            transition: "transform 0.18s ease, color 0.18s ease",
          }}
        />
      </button>
      {menu}
    </>
  );
}
