export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout>;
    return function (...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    } as T;
}

// Leading + trailing throttle: fires immediately on first call,
// then at most once per `interval` ms. A trailing call is guaranteed
// if the last event arrived during the cooldown window.
export function throttle<T extends (...args: any[]) => any>(fn: T, interval: number): T {
    let lastTime = 0;
    let trailing: ReturnType<typeof setTimeout> | undefined;

    return function (...args: Parameters<T>) {
        const now = Date.now();
        const remaining = interval - (now - lastTime);

        clearTimeout(trailing);

        if (remaining <= 0) {
            lastTime = now;
            fn(...args);
        } else {
            trailing = setTimeout(() => {
                lastTime = Date.now();
                fn(...args);
            }, remaining);
        }
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
