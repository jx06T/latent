export interface Partner {
  name: string;
  role: "主辦" | "協辦";
  logo?: string;
  url?: string;
}

export const PARTNERS: Partner[] = [
  { name: "建中電研", role: "主辦", url: "https://www.ckefgisc.org/" },
  { name: "建中資訊", role: "協辦" },
  { name: "成功電研", role: "協辦" },
  { name: "北一資研", role: "主辦", url: "https://www.ckefgisc.org/" },
  { name: "中山資研", role: "協辦" },
  { name: "景美電資", role: "協辦" },
];
