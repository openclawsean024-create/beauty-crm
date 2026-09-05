#!/usr/bin/env bash
# Beauty CRM — Lighthouse a11y 跑分腳本（DoD-7：Lighthouse a11y ≥90）
#
# 對齊 docs/AUDIT_v1.md §3 DoD-7：
# - 只跑 a11y category（不跑 perf / SEO，避免 Chromium 環境依賴）
# - 門檻：a11y ≥ 90（與 SPEC 一致）
# - 入口：已 build 的 next start server（`npm run build && npm run start`）
#
# 為什麼不安裝 lighthouse 套件：
# - lighthouse 是 heavyweight dep（~200MB Chromium + report assets）
# - v1 不需要 build-time 整合
# - 跑分交由 owner / CI 環境在需要時用 `npx --yes` 觸發
#
# 使用方式：
#   npm run build
#   npm run start &
#   sleep 3
#   bash scripts/lighthouse.sh http://localhost:3000
#
# 或用 lighthouserc.json 設定（搭配 @lhci/cli 或直接 npx lighthouse）。

set -euo pipefail

URL="${1:-http://localhost:3000}"
OUTPUT_PATH="${OUTPUT_PATH:-./lighthouse-report.html}"
THRESHOLD_A11Y="${THRESHOLD_A11Y:-90}"

echo "→ Lighthouse a11y 跑分"
echo "  URL: $URL"
echo "  Output: $OUTPUT_PATH"
echo "  a11y 門檻: $THRESHOLD_A11Y"
echo

# 確認 lighthouse 可用（透過 npx --yes 觸發，不污染 package.json）
if ! command -v npx >/dev/null 2>&1; then
  echo "✗ npx 不可用。請安裝 Node.js 20+ 與 npm 10+"
  exit 1
fi

# 確認 server 已經在跑（避免 lighthouse 連不到 port）
if ! curl -fsS -o /dev/null "$URL"; then
  echo "✗ 連不到 $URL。請先跑："
  echo "    npm run build && npm run start &"
  echo "    sleep 3"
  exit 1
fi

# 跑 lighthouse — 只 a11y category
npx --yes lighthouse@latest "$URL" \
  --only-categories=accessibility \
  --output=html \
  --output-path="$OUTPUT_PATH" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --quiet

# 解析報告中的 a11y 分數
A11Y_SCORE=$(node -e "
  const fs = require('fs');
  const html = fs.readFileSync('$OUTPUT_PATH', 'utf8');
  const m = html.match(/accessibility[^\d]*([0-9]+)/i) || html.match(/\"accessibility-score\":\s*([0-9.]+)/);
  const score = m ? parseFloat(m[1]) : 0;
  console.log(Math.round(score * 100));
")

echo
echo "→ a11y 分數: $A11Y_SCORE"

if [ "$A11Y_SCORE" -lt "$THRESHOLD_A11Y" ]; then
  echo "✗ a11y 門檻未達（$A11Y_SCORE < $THRESHOLD_A11Y）"
  echo "  報告：$OUTPUT_PATH"
  exit 1
fi

echo "✓ a11y 門檻通過（$A11Y_SCORE ≥ $THRESHOLD_A11Y）"
echo "  報告：$OUTPUT_PATH"
