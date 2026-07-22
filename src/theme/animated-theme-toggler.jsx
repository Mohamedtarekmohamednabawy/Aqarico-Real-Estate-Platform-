import { useCallback, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";

/**
 * Minimal class helper
 */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Creates collapsed polygon
 */
function polygonCollapsed(cx, cy, vertexCount) {
  return `polygon(${Array.from(
    { length: vertexCount },
    () => `${cx}px ${cy}px`
  ).join(", ")})`;
}

/**
 * Clip path generator
 */
function getThemeTransitionClipPaths(
  variant,
  cx,
  cy,
  maxRadius,
  viewportWidth,
  viewportHeight
) {
  switch (variant) {
    case "circle":
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];

    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;

      const end = [
        `${cx - halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy + halfSide}px`,
        `${cx - halfSide}px ${cy + halfSide}px`,
      ].join(", ");

      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }

    default:
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
  }
}

export function AnimatedThemeToggler({
  className = "",
  duration = 600,
  variant = "circle",
  fromCenter = false,
  checked,
  onCheckedChange,
  ...props
}) {
  const buttonRef = useRef(null);

  const toggleTheme = useCallback(() => {
    if (!onCheckedChange) return;

    const button = buttonRef.current;
    if (!button) return;

    const viewportWidth =
      window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight =
      window.visualViewport?.height ?? window.innerHeight;

    let x;
    let y;

    if (fromCenter) {
      x = viewportWidth / 2;
      y = viewportHeight / 2;
    } else {
      const { top, left, width, height } =
        button.getBoundingClientRect();
      x = left + width / 2;
      y = top + height / 2;
    }

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    );

    const applyTheme = () => {
      onCheckedChange(); // ✅ ONLY change state from ThemeProvider
    };

    // Fallback
    if (typeof document.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    const clipPath = getThemeTransitionClipPaths(
      variant,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight
    );

    const root = document.documentElement;

    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty(
      "--magicui-theme-toggle-vt-duration",
      `${duration}ms`
    );

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty(
        "--magicui-theme-toggle-vt-duration"
      );
    };

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        applyTheme();
      });
    });

    transition?.finished?.finally?.(cleanup);

    transition?.ready?.then?.(() => {
      document.documentElement.animate(
        { clipPath },
        {
          duration,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }, [onCheckedChange, variant, fromCenter, duration]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleTheme}
      className={cn(className)}
      {...props}
    >
      {checked ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}