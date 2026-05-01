import gsap from "gsap";

/**
 * 讓目標元素在主時間軸的一半時，向下移動 50vh
 * @param tl 大導演建立的 Master Timeline (負責掌控全局滾動)
 * @param target 要移動的目標元素
 */
export function initTargetDropAnimation(
    tl: gsap.core.Timeline,
    target: HTMLElement
): void {
    if (!target) return;

    tl.to(target, {
        y: "500vh",
        ease: "none",
    }, 0);
}