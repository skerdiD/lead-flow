"use client";

import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "default" | "scale";
  rootMargin?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = "default",
  rootMargin = "0px 0px -12% 0px",
  style,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (motionQuery.matches) {
      return;
    }

    const node = ref.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.unobserve(entry.target);
      },
      {
        threshold: 0.18,
        rootMargin,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(
        variant === "scale"
          ? "leadflow-scroll-reveal-scale"
          : "leadflow-scroll-reveal",
        isVisible && "is-visible",
        className
      )}
      style={
        {
          ...style,
          "--leadflow-reveal-delay": `${Math.min(delay, 220)}ms`,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}
