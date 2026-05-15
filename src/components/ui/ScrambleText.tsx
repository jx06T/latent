import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CHARS =
  "ギャアアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789!<>-_\\/[]{}—=+*^?#";

function getRandomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  duration?: number;
  trigger?: "load" | "hover" | "scroll";
}

export default function ScrambleText({
  text,
  className,
  duration = 1.0,
  trigger = "scroll",
}: ScrambleTextProps) {
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = displayRef.current;
    if (!target) return;

    const runAnimation = () => {
      const obj = { progress: 0 };
      gsap.to(obj, {
        progress: text.length,
        duration,
        ease: "none",
        onUpdate: () => {
          const currentIndex = Math.floor(obj.progress);
          const lockedText = text.slice(0, currentIndex);
          const scramblingChar = currentIndex < text.length ? getRandomChar() : "";
          target.innerText = lockedText + scramblingChar;
        },
        onComplete: () => {
          target.innerText = text;
        },
      });
    };

    if (trigger === "scroll") {
      const st = ScrollTrigger.create({
        trigger: target,
        start: "top 95%",
        refreshPriority: -1,
        onEnter: runAnimation,
        once: true,
      });
      return () => st.kill();
    } else if (trigger === "load") {
      const timeout = setTimeout(runAnimation, 100);
      return () => clearTimeout(timeout);
    } else if (trigger === "hover") {
      const parent = target.parentElement;
      if (!parent) return;
      parent.addEventListener("mouseenter", runAnimation, { once: true });
      return () => parent.removeEventListener("mouseenter", runAnimation);
    }
  }, [text, duration, trigger]);

  return (
    <span className={cn("scramble-wrapper relative inline-block align-bottom", className)}>
      <span className="invisible select-none" aria-hidden="true">
        {text}
      </span>
      <span
        ref={displayRef}
        className={cn("absolute top-0 left-0 whitespace-nowrap", className)}
      />
    </span>
  );
}
