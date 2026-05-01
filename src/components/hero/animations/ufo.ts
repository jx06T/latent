import gsap from "gsap";
import { ATTRS } from "../dom-registry";

export function initUfoTracking(ufoWrappers: HTMLElement[]): () => void {
    // 1. 將每個 Wrapper (Normal 和 Pixel) 裡的五官抓出來打包
    const ufoParts = ufoWrappers.map((wrapper) => {
        return {
            body: wrapper.querySelector(`[${ATTRS.ufo.body}]`),
            mouth: wrapper.querySelector(`[${ATTRS.ufo.mouth}]`),
            eyes: [
                wrapper.querySelector(`[${ATTRS.ufo.eyeL}]`),
                wrapper.querySelector(`[${ATTRS.ufo.eyeR}]`)
            ].filter(Boolean)
        };
    });

    // 2. 建立滑鼠監聽事件
    const onMouseMove = (e: MouseEvent) => {
        // 計算滑鼠距離中心點的百分比 (範圍大約 -1 到 1)
        const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
        const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;

        ufoParts.forEach((parts) => {
            // 身體微幅反向移動，增加圓柱體的弧面錯覺
            gsap.to(parts.body, { x: -xPercent * 1, y: -yPercent * 1, duration: 0.8, ease: "power2.out" });
            
            // 嘴巴順向移動
            gsap.to(parts.mouth, { x: xPercent * 14, y: yPercent * 10, duration: 0.8, ease: "power2.out" });
            
            // 眼睛順向移動最多，因為它最突出
            gsap.to(parts.eyes, { x: xPercent * 16, y: yPercent * 12, duration: 0.8, ease: "power2.out" });
        });
    };

    window.addEventListener("mousemove", onMouseMove);

    // 回傳清理函數，供 Astro 換頁時清除監聽器
    return () => {
        window.removeEventListener("mousemove", onMouseMove);
    };
}