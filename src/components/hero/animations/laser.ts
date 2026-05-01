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
        const scrollDeltaY   = currentScrollY - scrollY;
        scrollY = currentScrollY;

        const targetX = mouseX * 0.7;
        const targetY = mouseY * 0.7 + currentScrollY - window.innerHeight / 3;
        const lagY    = -scrollDeltaY * 1.5;

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
): void {
    gsap.ticker.add(() => {
        const targetRect = target.getBoundingClientRect();
        const centerX    = targetRect.left + targetRect.width / 2;
        const centerY    = targetRect.top  + targetRect.height / 2;
        const svgRect    = svg.getBoundingClientRect();

        wrappers.forEach((wrapper) => {
            const id  = wrapper.getAttribute(ATTRS.scanner.wrapper);
            const line = document.querySelector(`[${ATTRS.scanner.line}="${id}"]`);
            const box  = wrapper.querySelector(`[${ATTRS.scanner.box}="${id}"]`);
            if (!box || !line) return;

            const boxRect = box.getBoundingClientRect();
            const corners = [
                { x: boxRect.left,  y: boxRect.top    },
                { x: boxRect.right, y: boxRect.top    },
                { x: boxRect.left,  y: boxRect.bottom },
                { x: boxRect.right, y: boxRect.bottom },
            ];

            let closestCorner = corners[0];
            let minDist = Infinity;
            corners.forEach((corner) => {
                const dist = Math.hypot(corner.x - centerX, corner.y - centerY);
                if (dist < minDist) { minDist = dist; closestCorner = corner; }
            });

            gsap.set(line, {
                attr: {
                    x1: centerX         - svgRect.left,
                    y1: centerY         - svgRect.top,
                    x2: closestCorner.x - svgRect.left,
                    y2: closestCorner.y - svgRect.top,
                },
            });
        });
    });
}
