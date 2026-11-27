#!/usr/bin/env python3
"""Read authorized Discord patch notes. First run is read-only: no public archive or HTML changes."""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

GUILD = "1340878099771822193"
CHANNEL = "1340878365250424872"
HAN = re.compile(r"[\u3400-\u9fff]")
ZH = re.compile(r"^(?:[#>*\s-]*)?(?:繁體中文|繁中|中文|Chinese|TW|ZH(?:-TW)?)(?:\s*[：:|｜-]|$)", re.I)
EN = re.compile(r"^(?:[#>*\s-]*)?(?:英文|English|EN(?:GLISH)?)(?:\s*[：:|｜-]|$)", re.I)
VERSION = re.compile(r"(?<![\d.])(?:版本\s*[:：]?\s*|v(?:ersion|er)?\.?\s*)?(2\.\d{3,6}(?:\.\d{1,3})?)(?![\d.])", re.I)

def chinese_only(raw):
    if not HAN.search(raw or ""):
        return ""
    output, mode = [], "auto"
    for line in str(raw).replace("\r", "").split("\n"):
        value = line.strip().replace("*", "")
        if ZH.match(value):
            mode = "zh"
            continue
        if EN.match(value):
            mode = "en"
            continue
        if mode == "en":
            continue
        if not value:
            if output:
                output.append("")
        elif HAN.search(value):
            output.append(line)
        elif mode == "zh" and re.fullmatch(r"[\s*#>\-\d().：:、，。]+", value):
            output.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(output)).strip()

def message_text(message):
    pieces = [str(message.get("content") or "")]
    for embed in message.get("embeds") or []:
        if isinstance(embed, dict):
            for key in ("title", "description"):
                if embed.get(key):
                    pieces.append(str(embed[key]))
            for field in embed.get("fields") or []:
                pieces.append(str(field.get("name") or ""))
                pieces.append(str(field.get("value") or ""))
    return "\n".join(pieces)

def parse_message(message):
    raw = message_text(message)
    notes = chinese_only(raw)
    found = VERSION.search(raw)
    if not notes or not found:
        return None
    mid = str(message["id"])
    return {"version":found.group(1),"date":str(message.get("timestamp") or "")[:10],
        "category":"官方更新","title":"Discord 更新公告","zh":notes,"details":notes,
        "source":"Discord 公告頻道","sourceUrl":f"https://discord.com/channels/{GUILD}/{CHANNEL}/{mid}",
        "status":"Discord 來源（中文原文）","discordMessageId":mid}

def fetch_messages(token, before=None):
    query = {"limit":"100"}
    if before: query["before"] = before
    url = f"https://discord.com/api/v10/channels/{CHANNEL}/messages?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(url, headers={
        "Authorization":"Bot "+token, "Accept":"application/json",
        "User-Agent":"TowerSwordsReleaseArchive/1.0"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request,timeout=20) as response:
                payload = json.load(response)
            if not isinstance(payload,list):
                raise RuntimeError("Unexpected Discord response")
            return payload
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < 3:
                delay = min(12,max(1,float(exc.headers.get("Retry-After","2"))))
                time.sleep(delay)
                continue
            if exc.code in (401,403,404):
                raise RuntimeError(f"Discord HTTP {exc.code}; check token and channel permissions") from None
            raise
    raise RuntimeError("Discord API rate limit retries exhausted")

def main():
    token = os.environ.get("DISCORD_BOT_TOKEN","").strip()
    if not token:
        raise RuntimeError("GitHub Secret DISCORD_BOT_TOKEN missing")
    rows, before, total = {}, None, 0
    for _ in range(5):
        messages = fetch_messages(token,before)
        total += len(messages)
        for message in messages:
            parsed = parse_message(message)
            if parsed:
                rows[parsed["discordMessageId"]] = parsed
        if len(messages) < 100:
            break
        before = str(messages[-1]["id"])
    # The first diagnostic run deliberately publishes no message content.
    print("Discord API access: success")
    print(f"Channel messages scanned: {total}")
    print(f"Chinese announcements with version: {len(rows)}")
    print("Distinct versions:", ", ".join(sorted({r["version"] for r in rows.values()})[-15:]) or "(none)")
    if not rows:
        raise RuntimeError("Connected, but no Chinese version announcements found; inspect message formatting")
    # Do not write into the public repository before the user reviews the result.

if __name__=="__main__":
    try: main()
    except Exception as error:
        print("DISCORD_SYNC_ERROR:", str(error), file=sys.stderr)
        raise SystemExit(1)
