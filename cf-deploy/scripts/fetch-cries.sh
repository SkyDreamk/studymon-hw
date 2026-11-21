#!/bin/bash
# 把 PokeAPI 官方叫声（latest + legacy cries, ogg）镜像到本地 mp3，供养成页点精灵时播放。
# 物种：1-151 + 伊布进化形 196/197/470/471/700，共 156 个。
# 产物：public/static/audio/cries/p{no}.mp3（latest，命名跟立绘 /static/img/p{no}.webp 对齐）
#       public/static/audio/cries/legacy/p{no}.mp3（legacy，点精灵时与 latest 二选一随机播；
#       个别物种（如 700 仙子伊布，六世代才出）没有 legacy，缺失时播放端自动回落到 latest）。
# 用法（在 cf-deploy/ 下）：bash scripts/fetch-cries.sh（已存在且非空的文件跳过）。
set -u
cd "$(dirname "$0")/.." || exit 1
TMP="/tmp/cries-ogg"
mkdir -p "$TMP"
IDS="$(seq 1 151) 196 197 470 471 700"

fetch_one() { # $1=kind latest|legacy, $2=id
  local kind="$1"
  local id="$2"
  local ogg="$TMP/$kind-$id.ogg"
  local mp3
  if [ "$kind" = "latest" ]; then mp3="public/static/audio/cries/p$id.mp3";
  else mp3="public/static/audio/cries/legacy/p$id.mp3"; fi
  mkdir -p "$(dirname "$mp3")"
  if [ -s "$mp3" ]; then return 0; fi
  if ! curl -sf --retry 2 --max-time 30 -o "$ogg" "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/$kind/$id.ogg"; then
    echo "SKIP $kind $id（无此版本叫声）"; return 1
  fi
  if ! ffmpeg -v error -y -i "$ogg" -codec:a libmp3lame -q:a 4 "$mp3"; then
    echo "FAIL convert $kind $id"; return 1
  fi
  return 0
}

fail=0
for id in $IDS; do
  fetch_one latest "$id" || fail=$((fail+1))
  fetch_one legacy "$id" || fail=$((fail+1))
done
echo "done, failures/skips=$fail, latest=$(ls public/static/audio/cries/*.mp3 2>/dev/null | wc -l), legacy=$(ls public/static/audio/cries/legacy/*.mp3 2>/dev/null | wc -l), bytes=$(du -sb public/static/audio/cries | cut -f1)"
