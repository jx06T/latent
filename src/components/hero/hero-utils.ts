export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout>;
    return function (...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    } as T;
}

export function getBaseUnit(screenWidth: number): number {
    const baseVwPx = screenWidth / 100;
    const maxScreen = 1200;
    const minScreen = 450;
    const multiplierAtMax = 1.0;
    const multiplierAtMin = 1.8;

    let currentMultiplier: number;
    if (screenWidth >= maxScreen) {
        currentMultiplier = multiplierAtMax;
    } else if (screenWidth <= minScreen) {
        currentMultiplier = multiplierAtMin;
    } else {
        const ratio = (screenWidth - minScreen) / (maxScreen - minScreen);
        currentMultiplier = multiplierAtMin - (multiplierAtMin - multiplierAtMax) * ratio;
    }

    return baseVwPx * currentMultiplier;
}
