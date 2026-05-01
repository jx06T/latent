export type ScanBox = {
    id: string;
    label: string;
    x: string;
    y: string;
    w: number;
    h: number;
    speed: number;
};

export const scanBoxes: ScanBox[] = [
    {
        id: "o-1",
        label: "[ #03 octopus 93% ]",
        x: "2%",
        y: "55%",
        w: 12,
        h: 12.9,
        speed: 0.3,
    },
    {
        id: "j-1",
        label: "[ #03 jellyfish 93% ]",
        x: "80%",
        y: "62%",
        w: 10,
        h: 14.3,
        speed: 0.18,
    },
    {
        id: "b-1",
        label: "[ #07 bird 75% ]",
        x: "70%",
        y: "10%",
        w: 16,
        h: 8.6,
        speed: 0.16,
    },
    {
        id: "f-1",
        label: "[ #99 fish 57% ]",
        x: "15%",
        y: "73%",
        w: 18,
        h: 5.7,
        speed: 0.17,
    },
    {
        id: "g-1",
        label: "[ #99 ground 57% ]",
        x: "55%",
        y: "83%",
        w: 16,
        h: 7.1,
        speed: 0.19,
    },
    {
        id: "u-1",
        label: "[ #99 ground 57% ]",
        x: "35%",
        y: "26%",
        w: 15,
        h: 14.3,
        speed: 0.18,
    },
    {
        id: "u-2",
        label: "[ #99 ground 57% ]",
        x: "60%",
        y: "40%",
        w: 6,
        h: 4.3,
        speed: 0.2,
    },
];