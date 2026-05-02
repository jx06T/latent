import gsap from "gsap";
import { continuousPool } from "../log-data";

const MAX_VISIBLE = 9;

export function initLogAnimations(logContainer: HTMLElement): void {
  if (!logContainer) return;

  const entries = logContainer.querySelectorAll<HTMLElement>(".log-entry");
  if (entries.length === 0) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: logContainer,
      end: "top 20%",
      start: "top bottom",
      toggleActions: "play return play return",
    },
    onComplete: () => startContinuousLogs(logContainer),
  });

  entries.forEach((entry) => {
    const delaySec = parseInt(entry.getAttribute("data-log-delay") || "0") / 1000;
    tl.to(
      entry,
      { opacity: 1, x: 0, duration: 0.15, ease: "power2.out" },
      delaySec
    );
  });
}

function startContinuousLogs(container: HTMLElement): void {
  const list = container.querySelector<HTMLElement>(".log-list");
  if (!list) return;

  let idx = 0;

  const tick = () => {
    const { level, message } = continuousPool[idx % continuousPool.length];
    idx++;

    const current = list.querySelectorAll<HTMLElement>(".log-entry");
    if (current.length >= MAX_VISIBLE) {
      const oldest = current[0];
      gsap.to(oldest, {
        opacity: 0,
        height: 0,
        duration: 0.2,
        onComplete: () => oldest.remove(),
      });
    }

    const li = document.createElement("li");
    li.className = `log-entry log--${level.toLowerCase()}`;
    li.setAttribute("aria-hidden", "true");
    li.style.cssText = "opacity: 0; transform: translateX(-6px);";
    li.innerHTML = `<span class="log-level">[${level}]</span><span class="log-message">${message}</span>`;
    list.appendChild(li);
    gsap.to(li, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" });

    timerId = window.setTimeout(tick, 1000);
  };

  let timerId = window.setTimeout(tick, 1000);

  document.addEventListener(
    "astro:before-swap",
    () => clearTimeout(timerId),
    { once: true }
  );
}
