import gsap from "gsap";

export function initTargetDropAnimation(
    tl: gsap.core.Timeline,
    target: HTMLElement
): void {
    if (!target) return;

    tl.to(target, {
        // 🌟 1. 改用動態函數計算純數字，效能最好
        y: () => window.innerHeight * 5, 
        ease: "none",
        // 🌟 2. 這是解決 iPad 破洞與卡頓的核心！強迫硬體加速不中斷
        force3D: true 
    }, 0);
}