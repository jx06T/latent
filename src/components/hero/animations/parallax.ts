import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
