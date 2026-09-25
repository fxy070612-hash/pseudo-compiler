#!/usr/bin/env bash
# 把成品部署到阿里云服务器（宝塔面板，站点 :86 → http://112.124.28.206:86/）
#
# 用法：
#   ./_deploy_server.sh              # 部署当前工程里的成品
#   PCDIR=/别的副本 ./_deploy_server.sh
#
# 说明：
#   - 先上传到 /tmp 校验 md5，再 install 覆盖线上，避免半途断线留下半个文件
#   - 同时写 index.html（根路径直接可用）与中文名文件（便于按名下载）
#   - 依赖：/home/embar/.ssh/anbao_key（SSH key，勿打印内容）
#   - 本机 /etc/ssh/ssh_config.d 有坏软链，故所有 ssh/scp 都加 -F /dev/null
set -euo pipefail

KEY=${ANBAO_KEY:-$HOME/.ssh/anbao_key}
HOST=${DEPLOY_HOST:-root@112.124.28.206}
SITE=/www/wwwroot/112.124.28.206_86
PCDIR=${PCDIR:-$(cd "$(dirname "$0")" && pwd)}
SRC="$PCDIR/伪代码编译器.html"
[ -f "$SRC" ] || { echo "找不到成品: $SRC" >&2; exit 1; }
[ -f "$KEY" ] || { echo "找不到 SSH key: $KEY" >&2; exit 1; }

LOCAL_MD5=$(md5sum "$SRC" | awk '{print $1}')
echo "本地成品: $SRC ($(stat -c%s "$SRC") 字节, md5 $LOCAL_MD5)"

ssh -F /dev/null -i "$KEY" -o BatchMode=yes -o ConnectTimeout=10 "$HOST" true \
  || { echo "SSH 连不上 $HOST" >&2; exit 1; }

echo "→ 上传到 /tmp ..."
scp -F /dev/null -i "$KEY" -o BatchMode=yes -q "$SRC" "$HOST:/tmp/pseudo_deploy.html"

echo "→ 校验并安装到 $SITE ..."
ssh -F /dev/null -i "$KEY" -o BatchMode=yes "$HOST" "set -e
  REMOTE_MD5=\$(md5sum /tmp/pseudo_deploy.html | awk '{print \$1}')
  if [ \"\$REMOTE_MD5\" != \"$LOCAL_MD5\" ]; then echo '上传校验失败: '\$REMOTE_MD5 >&2; rm -f /tmp/pseudo_deploy.html; exit 1; fi
  install -o root -g root -m 644 /tmp/pseudo_deploy.html $SITE/index.html
  install -o root -g root -m 644 /tmp/pseudo_deploy.html '$SITE/伪代码编译器.html'
  rm -f /tmp/pseudo_deploy.html
  ls -l $SITE"

echo "→ 线上验证 ..."
LIVE_MD5=$(ssh -F /dev/null -i "$KEY" -o BatchMode=yes "$HOST" \
  "curl -s http://127.0.0.1:86/ | md5sum | awk '{print \$1}'")
echo "线上 md5: $LIVE_MD5"
if [ "$LIVE_MD5" = "$LOCAL_MD5" ]; then
  echo "✅ 部署成功，线上与本地一致： http://112.124.28.206:86/"
else
  echo "⚠️ 线上 md5 与本地不一致，请检查（可能要 Ctrl+F5 强刷浏览器缓存）" >&2
  exit 1
fi
