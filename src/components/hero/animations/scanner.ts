import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ATTRS } from "../dom-registry";
import { getBaseUnit } from "../hero-utils";
import type { ScanBox } from "../hero-data";

type SizeTarget = { targets: Element[]; wUnit: number; hUnit: number };

export function initScannerAnimations(
    heroSection: HTMLElement,
    svg: SVGSVGElement,
    wrappers: SVGElement[],
    boxes: ScanBox[]
): { updateSizes: () => void } {
    const sizeTargets: SizeTarget[] = [];

    if (wrappers.length === 0) return { updateSizes: () => { } };

    boxes.forEach((boxData) => {
        const wrapper = document.querySelector(`[${ATTRS.scanner.wrapper}="${boxData.id}"]`);
        if (!wrapper) return;

        const frame = wrapper.querySelector(`[${ATTRS.scanner.frame}="${boxData.id}"]`);
        const labelMask = wrapper.querySelector(`[${ATTRS.scanner.labelMask}="${boxData.id}"]`);
        const mask = document.querySelector(`[${ATTRS.scanner.mask}="${boxData.id}"]`);
        const line = document.querySelector(`[${ATTRS.scanner.line}="${boxData.id}"]`);

        if (!(frame && labelMask && mask && line)) return;

        sizeTargets.push({ targets: [wrapper, mask], wUnit: boxData.w, hUnit: boxData.h });

        const parallaxPair = [wrapper, mask];
        const animPair = [frame, mask];

        gsap.set(animPair, { "--scale-x": 0, "--scale-y": 0.02 });
        gsap.set(line, { opacity: 0 });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: wrapper,
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play reverse play reverse",
            },
        });
        tl.timeScale(1.5);

        tl.to(animPair, { "--scale-x": 1, duration: 0.4, ease: "power4.out" })
            .to(line, { opacity: 1, duration: 0.6 }, "<")
            .to(animPair, { "--scale-y": 1, duration: 0.6, ease: "power3.out" }, "-=0.2")
            .to(labelMask, { scaleX: 1, duration: 0.4, ease: "power2.out" }, "-=0.5");

        if (boxData.speed !== 0) {
            const yOffset = window.innerHeight * boxData.speed;
            gsap.set(parallaxPair, { "--parallax-y": `${yOffset / 2}px` });
            gsap.to(parallaxPair, {
                "--parallax-y": `${-yOffset}px`,
                ease: "none",
                scrollTrigger: {
                    trigger: heroSection,
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
            });
        }

        function randomFloat() {
            gsap.to(animPair, {
                "--float-x": `${gsap.utils.random(-4, 4)}%`,
                "--float-y": `${gsap.utils.random(-40, 40)}px`,
                duration: gsap.utils.random(1, 2),
                ease: "sine.inOut",
                onComplete: randomFloat,
            });
        }
        randomFloat();
    });

    function updateSizes() {
        const baseUnit = getBaseUnit(window.innerWidth);
        sizeTargets.forEach(({ targets, wUnit, hUnit }) => {
            gsap.set(targets, {
                attr: { width: wUnit * baseUnit, height: hUnit * baseUnit },
            });
        });
    }

    return { updateSizes };
}
