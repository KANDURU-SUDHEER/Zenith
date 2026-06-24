"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailsPanel } from "./details-panel";

interface MobileDetailsSheetProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Mobile bottom sheet for the Details panel.
 * Slides up from bottom with drag handle.
 */
export function MobileDetailsSheet({ isOpen, onToggle }: MobileDetailsSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0]!.clientY;
  }, []);

  const handleDragEnd = useCallback((e: React.TouchEvent) => {
    setIsDragging(false);
    const deltaY = e.changedTouches[0]!.clientY - startYRef.current;
    // Swipe down to close, swipe up to open
    if (deltaY > 50 && isOpen) onToggle();
    if (deltaY < -50 && !isOpen) onToggle();
  }, [isOpen, onToggle]);

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-16 z-40 flex flex-col rounded-t-2xl border-t border-border-subtle bg-surface-primary/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out",
        isOpen ? "translate-y-0" : "translate-y-[calc(100%+4rem)]"
      )}
      style={{ maxHeight: "calc(70vh - 4rem)" }}
    >
      {/* Drag Handle */}
      <button
        onClick={onToggle}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        className="flex w-full items-center justify-center py-2.5"
        aria-label={isOpen ? "Collapse details" : "Expand details"}
      >
        <div className="h-1 w-10 rounded-full bg-star-white/20" />
        <span className="ml-2 text-[10px] text-star-white/30">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </span>
      </button>

      {/* Content */}
      <div className={cn("flex-1 overflow-hidden", isDragging && "pointer-events-none")}>
        {/* Override the aside width constraints inside the sheet — sheet provides its own width */}
        <div className="h-full w-full [&_aside]:w-full [&_aside]:border-l-0">
          <DetailsPanel />
        </div>
      </div>
    </div>
  );
}
