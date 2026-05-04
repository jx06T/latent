# 圖片服務整合 · 待辦事項與手動配置指南

> 本文件記錄所有需要在外部服務手動操作的步驟，以及已知的注意事項。

---

## 1. 套用 Supabase Migration

本機 Supabase 已在 `supabase/migrations/20260504000000_add_project_images.sql` 建立遷移，
請執行以下指令套用：

```bash
pnpm dlx supabase migration up
# 或完整重建（會清空本機資料）
pnpm dlx supabase db reset
```

套用後，取得本機 Service Role Key 並填入 `.env`：

```bash
pnpm dlx supabase status
# 複製輸出中的 service_role key → SUPABASE_SERVICE_ROLE_KEY
```

之後重新生成 TypeScript 型別（可選）：

```bash
pnpm dlx supabase gen types typescript --local > src/lib/database.types.ts
```

---

## 2. Cloudflare R2 S3 API Token

Presigned URL 需要 S3 相容的 API Token，**不是** Cloudflare API Token：

1. 進入 [Cloudflare Dashboard](https://dash.cloudflare.com) → 左側 **R2**
2. 點選右上角 **Manage R2 API Tokens**
3. 建立新 Token：
   - Permissions：**Object Read & Write**
   - Specify bucket：選 `latent-img`
4. 複製以下資訊填入 `.env`：
   - `R2_ACCOUNT_ID`（頁面 URL 中的 32 字元 ID，或帳號 Overview 右側）
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`

> ⚠ Secret Key **只顯示一次**，請立即儲存。

---

## 3. Cloudflare R2 Lifecycle Rule（底線防禦）

針對 `drafts/` 目錄設定 180 天自動刪除，防止孤兒草稿永久佔用空間：

1. Cloudflare Dashboard → R2 → `latent-img` → **Settings** → **Object Lifecycle Rules**
2. 新增規則：
   - Prefix：`drafts/`
   - Rule：**Expire current versions** after **180 days**
3. 儲存。

> `/processed/` 不需要 Lifecycle Rule（永久保存）。

---

## 4. Image Worker 部署與公開 URL

`image-worker` 需要部署到 Cloudflare Workers，才能讓前端預覽草稿圖片，
以及讓發布後的 WebP 圖片可以公開讀取：

```bash
cd ../image-worker
npx wrangler deploy --env production
```

部署後取得 Worker URL（類似 `https://image-worker.<subdomain>.workers.dev`），
填入 `.env` 的 `PUBLIC_R2_WORKER_URL`。

若需要自訂網域（例如 `https://img.latent.site`），在 `wrangler.toml` 取消以下註解：
```toml
routes = [
  { pattern = "img.yourdomain.com", custom_domain = true }
]
```

---

## 5. Netlify 本機開發（Background Function）

背景函式 (`netlify/functions/publish-background.ts`) 需要 Netlify CLI：

```bash
npm install -g netlify-cli
netlify dev  # 替代 pnpm dev，同時啟動 Astro + Netlify Functions
```

`netlify dev` 預設在 port 8888，`.env` 的 `PUBLIC_SITE_URL` 已設為 `http://localhost:8888`。

> ⚠ Sharp 的 Linux 原生二進位在 Windows 本機 `netlify dev` 中可能無法運行。
> 可以暫時跳過背景函式測試，只測試上傳流程（`/api/upload-url`），
> 確認圖片確實出現在 R2 `drafts/` 目錄。

---

## 6. Netlify 部署環境變數

部署到 Netlify 後，需在 **Netlify Dashboard → Site → Environment variables** 設定：

| 變數名稱 | 說明 |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | 雲端 Supabase URL（非本機） |
| `PUBLIC_SUPABASE_ANON_KEY` | 雲端 Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 雲端 Supabase service_role key |
| `R2_ACCOUNT_ID` | Cloudflare 帳號 ID |
| `R2_ACCESS_KEY_ID` | R2 API Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Key |
| `R2_BUCKET_NAME` | `latent-img` |
| `PUBLIC_R2_WORKER_URL` | image-worker 的部署 URL |
| `INTERNAL_TOKEN` | 背景函式驗證 token（需與本機 `.env` 相同） |

> Netlify 會自動注入 `URL` 環境變數（站台的 HTTPS URL），
> `publish.ts` 優先使用 `PUBLIC_SITE_URL`，若未設定則 fallback 至 `http://localhost:8888`。
> 生產環境應確保此變數指向正確的 Netlify URL。

---

## 7. keep-alive Cron Job 遷移（vercel.json → Netlify）

原本 `vercel.json` 有一個每 5 小時 ping `/api/keep-alive` 的 cron job，
Netlify 的排程函式需要獨立設定：

**方案 A：Netlify Scheduled Functions（需 Pro 計劃）**
```toml
# 在 netlify.toml 加入
[functions."keep-alive"]
  schedule = "0 */5 * * *"
```

**方案 B：Supabase pg_cron（免費）**
在 Supabase SQL Editor 執行，定期自我 ping：
```sql
select cron.schedule('keep-alive', '0 */5 * * *', $$select 1$$);
```

**方案 C：UptimeRobot / Cron-Job.org（免費外部服務）**
設定每 5 小時 GET `https://your-site.netlify.app/api/keep-alive`。

---

## 8. 待實作項目（後續）

- [ ] **封面圖上傳**：目前只實作了 `content` 圖片，`cover` 的上傳流程（更新 `projects.cover_image`）尚未完成
- [ ] **Markdown 響應式渲染**：在 `src/pages/projects/2026/[...slug].astro` 的渲染層攔截 `<img>`，加上 `srcset`
- [ ] **Rate Limiting**：在 Netlify Functions 層加入 `/api/upload-url` 的請求速率限制
- [ ] **草稿上傳配額（3 個專案）**：目前未限制草稿專案數，需在 `/api/upload-url` 加入跨專案的草稿計數檢查
- [ ] **進階 Markdown 預覽**：在編輯器中加入即時渲染的預覽面板

---

*最後更新：2026-05-04*
