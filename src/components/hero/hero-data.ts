export type ScanBox = {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    speed: number;
};

export const scanBoxes: ScanBox[] = [
    {
        id: "o-1",
        label: "[ #03 octopus 93% ]",
        x: 2,
        y: 55,
        w: 12,
        h: 12.9,
        speed: 0.3,
    },
    {
        id: "j-1",
        label: "[ #03 jellyfish 93% ]",
        x: 80,
        y: 62,
        w: 10,
        h: 14.3,
        speed: 0.18,
    },
    {
        id: "b-1",
        label: "[ #07 bird 75% ]",
        x: 70,
        y: 10,
        w: 16,
        h: 8.6,
        speed: 0.16,
    },
    {
        id: "f-1",
        label: "[ #99 fish 57% ]",
        x: 15,
        y: 73,
        w: 18,
        h: 5.7,
        speed: 0.17,
    },
    {
        id: "g-1",
        label: "[ #99 ground 57% ]",
        x: 55,
        y: 83,
        w: 16,
        h: 7.1,
        speed: 0.19,
    },
    {
        id: "u-1",
        label: "[ #99 ground 57% ]",
        x: 35,
        y: 24,
        w: 14,
        h: 14.3,
        speed: 0.18,
    },
    {
        id: "u-2",
        label: "[ #99 ground 57% ]",
        x: 60,
        y: 40,
        w: 6,
        h: 4.3,
        speed: 0.2,
    },
];

export type FloatElement = {
    id: string;
    num: string;
    top: number;
    left: number;
    width: number;
    speed: number;
    wUnit: number;
};

export const floatElements: FloatElement[] = [
    { id: "f-1", num: "01", top: 60, left: 65,  width: 20, speed: 0.05, wUnit: 20 },
    { id: "b-1", num: "02", top: 15, left: 70,  width: 18, speed: 0.15, wUnit: 18 },
    { id: "c-1", num: "03", top: 20, left: 20,  width: 20, speed: 0.05, wUnit: 20 },
    { id: "f-2", num: "04", top: 70, left: 15,  width: 10, speed: 0.1,  wUnit: 10 },
    { id: "j-1", num: "05", top: 72, left: 80,  width: 16, speed: 0.1,  wUnit: 16 },
    { id: "j-1", num: "07", top: 75, left: 18,  width: 15, speed: 0.13, wUnit: 15 },
    { id: "c-2", num: "09", top: 25, left: 80,  width: 28, speed: 0.17, wUnit: 28 },
    { id: "o-1", num: "10", top: 58, left: -7,  width: 22, speed: 0.2,  wUnit: 22 },
];
