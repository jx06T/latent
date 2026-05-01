// src/components/Hero/dom-registry.ts

// 1. 定義所有的 HTML 屬性暗號
export const SELECTORS = {
    hero: '[data-hero]',

    bg: {
        wrapper: '[data-parallax-layer="wrapper"]'
    },

    floatingElements: '[data-floating-element]',

    scanner: {
        wrappers: '[data-floating-wrapper]',
        visuals: '[data-visual-target]',
        labels: '[data-label-target]',
        masks: '[data-mask-target]',
        floatInners: '[data-float-inner]',
        lines: '[data-line-target]',
        svg: '[data-scanner-svg]'
    },

};

// 2. 建立收集器，把 DOM 元素抓成一個乾淨的物件
export function getHeroElements(root: HTMLElement) {
    return {
        root,
        bg: {
            wrapper: root.querySelector<HTMLElement>(SELECTORS.bg.wrapper),
        },
        floatingElements: Array.from(root.querySelectorAll<HTMLElement>(SELECTORS.floatingElements)),

        scanner: {
            wrappers: Array.from(root.querySelectorAll<SVGElement>(SELECTORS.scanner.wrappers)),
            visuals: Array.from(root.querySelectorAll<SVGElement>(SELECTORS.scanner.visuals)),
            labels: Array.from(root.querySelectorAll<SVGElement>(SELECTORS.scanner.labels)),
            masks: Array.from(root.querySelectorAll<HTMLElement | SVGElement>(SELECTORS.scanner.masks)),
            lines: Array.from(root.querySelectorAll<SVGLineElement>(SELECTORS.scanner.lines)),
            svg: root.querySelector<SVGLineElement>(SELECTORS.scanner.svg),
        },

    };
}

// 匯出型別供 TypeScript 檢查
export type HeroElements = ReturnType<typeof getHeroElements>;