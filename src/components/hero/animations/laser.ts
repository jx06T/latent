import gsap from "gsap";
import { ATTRS } from "../dom-registry";

export function initLaserTarget(target: HTMLElement): () => void {
    let mouseX = 0;
    let mouseY = 0;
    let scrollY = window.scrollY;

    const xTo = gsap.quickTo(target, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(target, "y", { duration: 0.6, ease: "power3.out" });

    function onMouseMove(e: MouseEvent) {
        mouseX = e.clientX - window.innerWidth / 2;
        mouseY = e.clientY - window.innerHeight / 2;
    }

    function onTouchMove(e: TouchEvent) {
        const touch = e.touches[0];
        if (touch) {
            mouseX = (touch.clientX - window.innerWidth / 2) * 0.15;
            mouseY = (touch.clientY - window.innerHeight / 2) * 0.15;
        }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    gsap.ticker.add(() => {
        const currentScrollY = window.scrollY;
        const scrollDeltaY = currentScrollY - scrollY;
        scrollY = currentScrollY;
        let b = window.innerWidth < 768
            ? 0.3
            : window.innerWidth < 1024
                ? 0.4
                : window.innerWidth < 1280
                    ? 0.61
                    : window.innerWidth < 1536
                        ? 0.715
                        : 0.77
        if (window.innerHeight < 500) {
            // b +=  0.004 * (500 - window.innerHeight)
            b += 0.01 * (0.7 - b * 0.5) * (500 - window.innerHeight)
        }
        const targetX = mouseX * 0.7;
        const rawY = mouseY * 0.7 + currentScrollY - b * window.innerHeight;
        const maxY = window.innerHeight * (b + 0.46);

        const targetY = Math.min(rawY, maxY);
        const lagY = -scrollDeltaY * 1.5;

        xTo(targetX);
        yTo(targetY + lagY);
    });

    return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("touchmove", onTouchMove);
    };
}



export function initLaserLines(
    target: HTMLElement,
    svg: SVGSVGElement,
    wrappers: SVGElement[]
): () => void {
    let boxesCache: any[] = [];
    let svgSize = { width: 0, height: 0 };

    const updateCache = () => {
        const rawSvgRect = svg.getBoundingClientRect();

        // Target 永遠在畫面正中央，所以相對座標就是寬高的一半
        svgSize = { width: rawSvgRect.width, height: rawSvgRect.height };

        boxesCache = wrappers.map((wrapper) => {
            const id = wrapper.getAttribute(ATTRS.scanner.wrapper);
            const line = document.querySelector(`[${ATTRS.scanner.line}="${id}"]`);
            const frame = wrapper.querySelector(`[${ATTRS.scanner.frame}="${id}"]`);
            const box = wrapper.querySelector(`[${ATTRS.scanner.box}="${id}"]`);

            const staticRectEl = wrapper.querySelector(`[${ATTRS.scanner.static}="${id}"]`);

            if (!frame || !line || !staticRectEl) return null;

            const sRect = staticRectEl.getBoundingClientRect();

            return {
                line,
                frame,
                box,
                base: {
                    left: sRect.left - rawSvgRect.left,
                    top: sRect.top - rawSvgRect.top,
                    width: sRect.width,
                    height: sRect.height
                }
            };
        }).filter(Boolean);
    };

    updateCache();

    const resizeObserver = new ResizeObserver(() => updateCache());
    resizeObserver.observe(svg);

    const tickerFn = () => {
        const targetX = gsap.getProperty(target, "x") as number;
        const targetY = gsap.getProperty(target, "y") as number;

        const relativeTargetX = (svgSize.width / 2) + targetX;
        const relativeTargetY = (svgSize.height / 2) + targetY;

        boxesCache.forEach(({ line, frame,box, base }) => {
            const tx = gsap.getProperty(frame, "x") as number;
            const ty = gsap.getProperty(frame, "y") as number;
            const sx = gsap.getProperty(box, "scaleX") as number;
            const sy = gsap.getProperty(box, "scaleY") as number;

            const currentLeft = base.left + tx;
            const currentRight = base.left + tx + (base.width * sx);
            const currentTop = base.top + ty;
            const currentBottom = base.top + ty + (base.height * sy);

            const corners = [
                { x: currentLeft, y: currentTop },
                { x: currentRight, y: currentTop },
                { x: currentLeft, y: currentBottom },
                { x: currentRight, y: currentBottom },
            ];

            let closestCorner = corners[0];
            let minDist = Infinity;
            corners.forEach((corner) => {
                const dist = Math.hypot(corner.x - relativeTargetX, corner.y - relativeTargetY);
                if (dist < minDist) { minDist = dist; closestCorner = corner; }
            });

            gsap.set(line, {
                attr: {
                    x1: relativeTargetX,
                    y1: relativeTargetY,
                    x2: closestCorner.x,
                    y2: closestCorner.y,
                },
            });
        });
    };

    gsap.ticker.add(tickerFn);

    return () => {
        resizeObserver.disconnect();
        gsap.ticker.remove(tickerFn);
    };
}