import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getBaseUnit } from "../hero-utils";
import type { FloatElement } from "../hero-data";

export function initFloatParallax(heroSection: HTMLElement, els: HTMLElement[]): void {
    els.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-speed") || "0");
        if (speed === 0) return;

        gsap.to(el, {
            y: () => -window.innerHeight * speed * 1.5,
            ease: "none",
            scrollTrigger: {
                trigger: heroSection,
                start: "top top",
                end: "bottom top",
                scrub: true,
            },
        });
    });
}

// els contains normal + pixel sets (each data.length items, normal first).
// index % data.length maps each DOM element to its FloatElement data.
export function initFloatSizes(
    els: HTMLElement[],
    data: FloatElement[]
): { updateSizes: () => void } {
    function updateSizes() {
        const baseUnit = getBaseUnit(window.innerWidth);
        els.forEach((el, i) => {
            const item = data[i % data.length];
            gsap.set(el, { width: item.wUnit * baseUnit });
        });
    }
    return { updateSizes };
}
