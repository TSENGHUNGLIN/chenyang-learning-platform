import { useEffect, useRef } from "react";
import introJs from "intro.js";
import "intro.js/introjs.css";

export interface TourStep {
  element?: string;
  intro: string;
  position?: "top" | "bottom" | "left" | "right" | "auto";
  title?: string;
}

interface UseIntroTourOptions {
  steps: TourStep[];
  storageKey: string; // localStorage key to track if tour has been shown
  autoStart?: boolean; // Whether to start tour automatically on first visit
  onComplete?: () => void;
  onExit?: () => void;
}

export function useIntroTour({
  steps,
  storageKey,
  autoStart = true,
  onComplete,
  onExit,
}: UseIntroTourOptions) {
  const introRef = useRef<ReturnType<typeof introJs> | null>(null);

  useEffect(() => {
    // Check if tour has been shown before
    const hasShownTour = localStorage.getItem(storageKey);

    if (autoStart && !hasShownTour) {
      // Delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        startTour();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [storageKey, autoStart]);

  const startTour = () => {
    if (introRef.current) {
      introRef.current.exit(true);
    }

    const intro = introJs();
    introRef.current = intro;

    intro.setOptions({
      steps: steps.map((step) => ({
        element: step.element,
        intro: step.intro,
        position: step.position || "auto",
        title: step.title,
      })),
      showProgress: true,
      showBullets: true,
      exitOnOverlayClick: false,
      exitOnEsc: true,
      nextLabel: "下一步",
      prevLabel: "上一步",
      doneLabel: "完成",
      skipLabel: "跳過",
      hidePrev: false,
      hideNext: false,
    });

    intro.oncomplete(() => {
      localStorage.setItem(storageKey, "true");
      if (onComplete) {
        onComplete();
      }
    });

    intro.onexit(() => {
      localStorage.setItem(storageKey, "true");
      if (onExit) {
        onExit();
      }
    });

    intro.start();
  };

  const resetTour = () => {
    localStorage.removeItem(storageKey);
  };

  return {
    startTour,
    resetTour,
  };
}

