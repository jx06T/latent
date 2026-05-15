# ✦ LATENT

> **Latent [adj.]** — present but not yet visible or active.
> 潛伏的能量：那些還沒被世界發現、但已悄悄成形的創作。

**LATENT** 是為「2026 建北電資聯合社展」專屬打造的官方專題發表平台。這不只是一個展示網站，更是一個內建高度自訂 Markdown 編輯器、非同步圖片處理管線與即時狀態更新的現代化內容管理系統 (CMS)。

本專案旨在讓每一段學生開發者的學習歷程，都有機會以最完美的姿態被世界看見。

![LATENT Platform](https://assets.exhibit.ckefgisc.org/projects/2764f273-7cae-4fd8-98f4-4862c065b8e6/md/0e2d50b7-437e-4738-827b-82c46a09e7f9.webp)

## 核心亮點 (Features)

### 為開發者而生的寫作體驗

- **自訂 Markdown 編輯器**：基於 React 19 構建的雙欄編輯器，支援即時預覽與 GitHub 風格的提示區塊 (Callouts)。
- **無縫圖片管理 (Seamless Swap)**：支援拖曳上傳，前端即時壓縮，並將圖片安全儲存至 Cloudflare R2。
- **背景圖片處理**：整合 Netlify Background Functions，上傳的草稿圖將在發布時於背景自動壓縮並轉換為 WebP 格式，同時生成多種響應式尺寸 (sm/md/lg)。

### 極致的效能與互動

- **Astro 島嶼架構 (Islands Architecture)**：公開頁面採高度靜態化與 SSR 混合渲染，儀表板與編輯器則由 React Islands 負責複雜互動，達到完美的效能平衡。
- **Supabase Realtime**：發布流程的狀態轉換 (Draft → Processing → Published) 皆透過 WebSocket 即時反映至前端 UI。
- **隱私友善追蹤**：整合 Umami 進行無 Cookie 的匿名流量分析。

---

## 技術棧 (Tech Stack)

| 領域             | 技術/框架                                                                   |
| :--------------- | :-------------------------------------------------------------------------- |
| **核心框架**     | [Astro 6](https://astro.build/) (SSR 模式) + [React 19](https://react.dev/) |
| **樣式系統**     | [Tailwind CSS 4](https://tailwindcss.com/)                                  |
| **資料庫與驗證** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)              |
| **物件儲存**     | Cloudflare R2 (S3 相容 API)                                                 |
| **背景函式**     | Netlify Functions (搭配 [sharp](https://sharp.pixelplumbing.com/) 處理圖片) |
| **部署環境**     | Netlify (預設) / Vercel 雙支援                                              |

---

## 本地開發 (Local Development)

### 1. 安裝環境需求

- Node.js
- npm 或 pnpm
- Docker (用於運行本地 Supabase)
- Netlify CLI (`npm install -g netlify-cli`)

### 2. 初始化專案

```bash
git clone https://github.com/jx06T/latent.git
cd latent

pnpm install
```

### 3. 設定環境變數

請複製 `.env.example` 並更名為 `.env`，填入對應的金鑰。

### 4. 啟動開發伺服器

建議使用 Netlify CLI 啟動，以確保本地端能正確模擬 Background Functions 環境：

```bash
npx supabase start
netlify dev
```

---

## 版權與開源協議 (License)

我們擁抱開源精神，希望這套專為學生展覽設計的系統能對未來的開發者有所幫助。

- **程式碼授權**：本專案之核心原始碼採用 [MIT License](LICENSE) 進行開源。你可以自由使用、修改與散佈，唯須保留原作者的版權聲明。
- **平台內容授權**：本站所刊載之所有**參展專題作品**，其著作權皆完全歸屬於原創作者所有；**官方活動資訊**歸屬於 [建北電資 (CKEFGISC)](https://www.ckefgisc.org/)。
- **品牌宣告**：本站之特定視覺設計與「LATENT」品牌標誌保留所有權利。

---

**Crafted by [JX06T](https://github.com/jx06T)**
