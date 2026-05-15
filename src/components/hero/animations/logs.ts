import gsap from "gsap";
import { continuousPool } from "../log-data";

const MAX_VISIBLE = 9;

export function initLogAnimations(logContainer: HTMLElement): () => void {
  let continuousCleanup: (() => void) | null = null;

  if (!logContainer) return () => {};

  const entries = logContainer.querySelectorAll<HTMLElement>(".log-entry");
  if (entries.length === 0) return () => {};

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: logContainer,
      end: "top 20%",
      start: "top bottom",
      toggleActions: "play return play return",
    },
    onComplete: () => {
      continuousCleanup = startContinuousLogs(logContainer);
    },
  });

  entries.forEach((entry) => {
    const delaySec = parseInt(entry.getAttribute("data-log-delay") || "0") / 1000;
    tl.to(
      entry,
      { opacity: 1, x: 0, duration: 0.15, ease: "power2.out" },
      delaySec
    );
  });

  return () => continuousCleanup?.();
}

function startContinuousLogs(container: HTMLElement): () => void {
  const list = container.querySelector<HTMLElement>(".log-list");
  if (!list) return;

  let idx = 0;
  // 取得單行高度 (假設用第一行的高度來當作位移量)
  const lineHeight = list.children[0]?.getBoundingClientRect().height || 28;

  const tick = () => {
    const { level, message } = continuousPool[idx % continuousPool.length];
    idx++;

    // 1. 新增新的 Log
    const li = document.createElement("li");
    li.className = `log-entry log--${level.toLowerCase()}`;
    li.setAttribute("aria-hidden", "true");
    li.innerHTML = `<span class="log-level">[${level}]</span><span class="log-message">${message}</span>`;
    list.appendChild(li);

    // 初始狀態設在下面，並設定透明
    gsap.set(li, { opacity: 0, x: -6 });

    // 我們不去改高度，而是讓新元素淡入、同時把整個 list 往上推一行
    const current = list.querySelectorAll<HTMLElement>(".log-entry");
    
    // 讓新的這行淡入
    gsap.to(li, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" });

    if (current.length > MAX_VISIBLE) {
        const oldest = current[0];
        
        // 讓舊的這行直接淡出 (不改高度)
        gsap.to(oldest, {
            opacity: 0,
            duration: 0.2,
        });

        // 讓整個容器往上推，模擬舊行消失的效果，動畫結束後瞬間歸位並砍掉舊的
        gsap.to(list, {
            y: -lineHeight,
            duration: 0.2,
            ease: "power1.inOut",
            onComplete: () => {
                oldest.remove();
                gsap.set(list, { y: 0 }); // 瞬間歸位
            }
        });
    }

    timerId = window.setTimeout(tick, 1000);
  };

  let timerId = window.setTimeout(tick, 1000);

  return () => clearTimeout(timerId);
}