import gsap from "gsap";

const continuousPool: Array<{ level: string; message: string }> = [
  { level: "OK",   message: "classified in 7.8ms" },
  { level: "INFO", message: "batch complete: 12/12" },
  { level: "WARN", message: "memory usage: 84%" },
  { level: "OK",   message: "classified in 4.1ms" },
  { level: "INFO", message: "uptime: 2h 14m" },
  { level: "ERR",  message: "connection reset" },
  { level: "WARN", message: "retry limit approaching" },
  { level: "OK",   message: "classified in 9.2ms" },
  { level: "INFO", message: "queue depth: 0" },
  { level: "OK",   message: "classified in 6.5ms" },
  { level: "INFO", message: "model loaded: v2.3.1" },
  { level: "WARN", message: "throughput below threshold" },
];

const MAX_VISIBLE = 9;

export function initLogAnimations(logContainer: HTMLElement): void {
  if (!logContainer) return;

  const entries = logContainer.querySelectorAll<HTMLElement>(".log-entry");
  if (entries.length === 0) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: logContainer,
      start: "top 75%",
      // play once on enter, never reverse — eliminates stutter on scroll back
      toggleActions: "play none none none",
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

    // Evict oldest entry when at limit
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

    // Build and animate new entry
    const li = document.createElement("li");
    li.className = `log-entry log--${level.toLowerCase()}`;
    li.setAttribute("aria-hidden", "true");
    li.style.cssText = "opacity: 0; transform: translateX(-6px);";
    li.innerHTML = `<span class="log-level">[${level}]</span><span class="log-message">${message}</span>`;
    list.appendChild(li);
    gsap.to(li, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" });

    timerId = window.setTimeout(tick, 2500);
  };

  let timerId = window.setTimeout(tick, 2500);

  document.addEventListener(
    "astro:before-swap",
    () => clearTimeout(timerId),
    { once: true }
  );
}
