import gsap from "gsap";

export function initLogAnimations(logContainer: HTMLElement): void {
  if (!logContainer) return;

  const entries = logContainer.querySelectorAll<HTMLElement>('.log-entry');
  if (entries.length === 0) return;

  // 建立一個時間軸，綁定到 logContainer 本身
  // 當 logContainer 出現在畫面上時觸發
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: logContainer,
      start: "top 75%", // 當幕布往下掉，碰到螢幕下方 25% 處開始打字
      toggleActions: "play none none reverse", // 往下滾播一次，往上滾收回
    }
  });

  // 使用 GSAP 的 stagger (錯開播放) 和陣列中設定的 data-log-delay
  entries.forEach((entry) => {
    // 將 delay (毫秒) 轉為秒數
    const delaySec = parseInt(entry.getAttribute("data-log-delay") || "0") / 1000;
    
    tl.to(entry, {
      opacity: 1,
      x: 0, // 從 -6px 滑進來
      duration: 0.15,
      ease: "power2.out"
    }, delaySec); // 【關鍵】使用 delaySec 當作 Timeline 上的絕對播放時間！
  });
}