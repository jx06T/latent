// src/components/Hero/dom-registry.ts

// 1. 定義所有的 HTML 屬性暗號
export const SELECTORS = {
    hero: '[data-hero]',

    bg: {
        wrapper: '[data-parallax-layer="wrapper"]'
    },

    floatingElements: '[data-floating-element]',

    scanner: {
        visuals: '[data-visual-target]',
        masks: '[data-mask-target]',
        lines: '[data-line-target]',
    },

    // 2. 雙序列地面 (GroundSequence) - 預留
    ground: {
        container: '[data-ground-container]',
        canvasNormal: '[data-canvas="normal"]',
        canvasPixel: '[data-canvas="pixel"]',
    },

    // 3. 飛碟系統 (UfoSystem) - 預留
    ufo: {
        container: '[data-ufo-container]',
        body: '[data-ufo-body]',
        face: '[data-ufo-face]',
        glare: '[data-ufo-glare]',
    },

    // 4. 標題文字 (Title) - 預留
    title: {
        wrapper: '[data-title-wrapper]',
        main: '[data-title-main]',
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
            visuals: Array.from(root.querySelectorAll<HTMLElement | SVGElement>(SELECTORS.scanner.visuals)),
            masks: Array.from(root.querySelectorAll<HTMLElement | SVGElement>(SELECTORS.scanner.masks)),
            lines: Array.from(root.querySelectorAll<SVGLineElement>(SELECTORS.scanner.lines)),
        },
        
        // 以下為預留，目前找不到會回傳 null，不影響程式運作
        ground: {
            container: root.querySelector<HTMLElement>(SELECTORS.ground.container),
        },
        ufo: {
            container: root.querySelector<HTMLElement>(SELECTORS.ufo.container),
        },
        // ... 可以依照需求隨時擴充
    };
}

// 匯出型別供 TypeScript 檢查
export type HeroElements = ReturnType<typeof getHeroElements>;