export const SELECTORS = {
    hero: '[data-hero]',
    bg: { wrapper: '[data-parallax-layer="wrapper"]' },
    floatingElements: '[data-floating-element]',
    scanner: {
        visuals: '[data-visual-target]',
        labels: '[data-label-target]',
        masks: '[data-mask-target]',
        lines: '[data-line-target]',
        svg: '[data-scanner-svg]'
    },
};

export function getHeroElements(root: HTMLElement) {
    return {
        root,
        bg: { wrapper: root.querySelector<HTMLElement>(SELECTORS.bg.wrapper) },
        floatingElements: Array.from(root.querySelectorAll<HTMLElement>(SELECTORS.floatingElements)),
        scanner: {
            visuals: Array.from(root.querySelectorAll<SVGElement>(SELECTORS.scanner.visuals)),
            masks: Array.from(root.querySelectorAll<SVGElement>(SELECTORS.scanner.masks)),
            lines: Array.from(root.querySelectorAll<SVGLineElement>(SELECTORS.scanner.lines)),
            svg: root.querySelector<SVGSVGElement>(SELECTORS.scanner.svg),
        },
    };
}

export type HeroElements = ReturnType<typeof getHeroElements>;
