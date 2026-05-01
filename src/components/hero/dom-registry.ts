// 1. 定義 HTML 屬性名稱 (這些是真正的 Source of Truth)
export const ATTRS = {
    hero: 'data-hero',
    bgStatic: 'data-bg-static',
    floating: 'data-floating-element',
    scanner: {
        wrapper: 'data-scanner-wrapper',
        frame: 'data-scanner-frame',
        box: 'data-scanner-box',
        label: 'data-scanner-label',
        labelMask: 'data-scanner-label-mask',
        mask: 'data-scanner-mask',
        line: 'data-scanner-line',
        svg: 'data-scanner-svg'
    },
    laserTarget: 'data-laser-target',
} as const;

// 2. 小工具：把屬性名稱轉成 CSS 選擇器 "[data-xxx]"
const getSel = (attr: string) => `[${attr}]`;

// 3. 匯出選擇器 (供 querySelector 使用)
export const SELECTORS = {
    hero: getSel(ATTRS.hero),
    bgStatic: getSel(ATTRS.bgStatic),
    floatingElements: getSel(ATTRS.floating),
    scanner: {
        wrappers: getSel(ATTRS.scanner.wrapper),
        frames: getSel(ATTRS.scanner.frame),
        box: getSel(ATTRS.scanner.box),
        labels: getSel(ATTRS.scanner.label),
        labelMasks: getSel(ATTRS.scanner.labelMask),
        masks: getSel(ATTRS.scanner.mask),
        lines: getSel(ATTRS.scanner.line),
        svg: getSel(ATTRS.scanner.svg)
    },
    laserTarget: getSel(ATTRS.laserTarget),
};

// 4. 收集全域單例元素。Per-box 的子元素由各動畫模組自行查詢 (scanner.ts)。
export function getHeroRoot(root: HTMLElement) {
    return {
        root,
        bgStatic: root.querySelector<HTMLElement>(SELECTORS.bgStatic),
        laserTarget: root.querySelector<HTMLElement>(SELECTORS.laserTarget),
        svg: root.querySelector<SVGSVGElement>(SELECTORS.scanner.svg),
        floatingEls: Array.from(root.querySelectorAll<HTMLElement>(SELECTORS.floatingElements)),
        scanWrappers: Array.from(root.querySelectorAll<SVGElement>(SELECTORS.scanner.wrappers)),
        scanLines: Array.from(root.querySelectorAll<SVGLineElement>(SELECTORS.scanner.lines)),
    };
}

export type HeroRoot = ReturnType<typeof getHeroRoot>;
