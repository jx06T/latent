export interface Partner {
  name: string;
  role: "主辦" | "協辦";
  logo?: string;
  url?: string;
}

export const PARTNERS: Partner[] = [
  { name: "建中電子研究社", role: "主辦" },
  { name: "建中資訊社", role: "協辦" },
  { name: "成功電子研究社", role: "協辦" },
  { name: "北一女資訊研究社", role: "主辦" },
  { name: "中山女高資訊研究社", role: "協辦" },
  { name: "景美電腦研究社", role: "協辦" },
];
