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
        const wrapper = svg.querySelector(`[${ATTRS.scanner.wrapper}="${boxData.id}"]`);
        if (!wrapper) return;

        const frame = wrapper.querySelector(`[${ATTRS.scanner.frame}="${boxData.id}"]`);
        const box = wrapper.querySelector(`[${ATTRS.scanner.box}="${boxData.id}"]`);
        const mask = svg.querySelector(`[${ATTRS.scanner.mask}="${boxData.id}"]`);
        const line = svg.querySelector(`[${ATTRS.scanner.line}="${boxData.id}"]`);

        const label = svg.querySelector(`[data-scanner-label="${boxData.id}"]`);
        const labelMask = svg.querySelector(`[data-scanner-label-mask="${boxData.id}"]`);

        if (!(frame && box && mask && line && label && labelMask)) return;

        sizeTargets.push({ targets: [wrapper, mask], wUnit: boxData.w, hUnit: boxData.h });

        const state = { pY: 0, fX: 0, fY: 0, sX: 0, sY: 0.02 };

        const renderTransforms = () => {
            gsap.set([frame, mask, label], {
                x: state.fX,
                y: state.pY + state.fY,
            });

            gsap.set([box, mask], {
                scaleX: state.sX,
                scaleY: state.sY,
                transformOrigin: "0% 0%"
            });
        };

        gsap.set(labelMask, { scaleX: 0, transformOrigin: "0% 0%" });
        gsap.set(line, { opacity: 0 });
        renderTransforms();

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: wrapper,
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play reverse play reverse",
            },
        });
        tl.timeScale(1.5);

        // 動畫：包含 labelMask 的展開
        tl.to(state, { sX: 1, duration: 0.4, ease: "power4.out", onUpdate: renderTransforms })
            .to(line, { opacity: 1, duration: 0.6 }, "<")
            .to(state, { sY: 1, duration: 0.6, ease: "power3.out", onUpdate: renderTransforms }, "-=0.2")
            .to(labelMask, { scaleX: 1, duration: 0.4, ease: "power2.out" }, "-=0.5"); // 🌟 動畫加回來了！

        const confEl = document.querySelector<SVGTSpanElement>(`[data-scanner-conf="${boxData.id}"]`);
        if (confEl) startConfidenceFlicker(confEl, boxData.confidence);

        // ... (Parallax 與 RandomFloat 邏輯保持原樣不變) ...
        if (boxData.speed !== 0) {
            gsap.fromTo(state,
                // 每次 Refresh 時，重新計算起點
                { pY: () => (window.innerHeight * boxData.speed) / 2 },
                {
                    // 每次 Refresh 時，重新計算終點
                    pY: () => -window.innerHeight * boxData.speed,
                    ease: "none",
                    scrollTrigger: {
                        trigger: heroSection,
                        start: "top top",
                        end: "bottom top",
                        scrub: true,
                        invalidateOnRefresh: true, // 視窗改變大小時強制重算 () => 的數值
                    },
                    onUpdate: renderTransforms
                }
            );
        }

        function startConfidenceFlicker(el: SVGTSpanElement, base: number): void {
            let timerId: number;
            const tick = () => {
                const delta = Math.round((Math.random() * 2 - 1) * 15);
                const val = Math.min(99, Math.max(1, base + delta));
                el.textContent = String(val).padStart(2, "0") + "%";
                timerId = window.setTimeout(tick, 500);
            };
            timerId = window.setTimeout(tick, 1000 + Math.random() * 1000);
            document.addEventListener("astro:before-swap", () => clearTimeout(timerId), { once: true });
        }

        function randomFloat() {
            gsap.to(state, {
                fX: gsap.utils.random(-4 * getBaseUnit(window.innerWidth), 4 * getBaseUnit(window.innerWidth)),
                fY: gsap.utils.random(-40, 40),
                duration: gsap.utils.random(1, 2),
                ease: "sine.inOut",
                onUpdate: renderTransforms,
                onComplete: randomFloat,
            });
        }
        randomFloat();
    });

    // ... updateSizes ...
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