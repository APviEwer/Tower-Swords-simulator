#!/usr/bin/env python3
"""R48. Merge Discord zh-Hant patch notes and latest App Store release into static JSON.
Never publishes secrets. A failed fetch aborts without replacing the archive.
Run on a test branch first; publishing to main requires separate review.
"""
from pathlib import Path
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"r48-updates.json"
GUILD="1340878099771822193"
CHANNEL="1340878365250424872"
APP_ID="1660251779"
HAN=re.compile(r"[\u3400-\u9fff]")
VERSION=re.compile(r"(?<![\d.])(?:版本\s*[:：]?\s*|v(?:ersion|er)?\.?\s*)?(2\.\d{3,6}(?:\.\d{1,3})?)(?![\d.])",re.I)
ZH=re.compile(r"^(?:[#>*\s-]*)?(?:繁體中文|繁中|中文|Chinese|TW|ZH(?:-TW)?)(?:\s*[：:|｜-]|$)",re.I)
EN=re.compile(r"^(?:[#>*\s-]*)?(?:英文|English|EN(?:GLISH)?)(?:\s*[：:|｜-]|$)",re.I)
HEADINGS=["新增內容","數值調整","問題修正","系統優化","其他更新"]
def get_json(url,token=None):
    headers={"User-Agent":"TowerSwordsR48Archive/1.0","Accept":"application/json"}
    if token:headers["Authorization"]="Bot "+token
    req=urllib.request.Request(url,headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=25) as response:return json.load(response)
        except urllib.error.HTTPError as e:
            if e.code==429 and attempt<3:
                time.sleep(min(12,max(1,float(e.headers.get("Retry-After","2")))));continue
            raise RuntimeError("GET request failed: HTTP "+str(e.code)+" from "+url.split("?")[0]) from None
    raise RuntimeError("request exhausted retry attempts")
def zh_only(raw):
    if not HAN.search(raw or ""):return ""
    rows=[]; mode="auto"
    for line in str(raw).replace("\r","").split("\n"):
        stripped=line.strip().replace("*","")
        if ZH.match(stripped):mode="zh";continue
        if EN.match(stripped):mode="en";continue
        if mode=="en":continue
        if not stripped:
            if rows:rows.append("")
        elif HAN.search(stripped):
            rows.append(line.strip())
        elif mode=="zh" and re.fullmatch(r"[\s*#>\-\d().：:、，。]+",stripped):
            rows.append(line.strip())
    return re.sub(r"\n{3,}","\n\n","\n".join(rows)).strip()
def classify(text):
    t=text.lower()
    if re.search(r"新增|追加|開放|加入|new\b|added|introduc",t):return "新增內容"
    if re.search(r"修正|修復|錯誤|異常|問題|bug|fix|correct|prevent",t):return "問題修正"
    if re.search(r"調整|上限|增加|降低|減少|平衡|倍率|level cap|balanc|reduc|increas",t):return "數值調整"
    if re.search(r"優化|改善|效能|速度|穩定|流暢|improv|optim|performan|stabil",t):return "系統優化"
    return "其他更新"
def sections_of(text):
    groups={k:[] for k in HEADINGS}
    for line in text.splitlines():
        line=line.strip()
        if not line:continue
        line=re.sub(r"^[\s*•·\-]+","",line).strip()
        if not line:continue
        groups[classify(line)].append(line)
    return [{"heading":k,"items":v} for k,v in groups.items() if v]
def title_of(text,version):
    # Explicit, short Chinese first-line titles only; never generate undocumented features.
    for line in text.splitlines():
        line=line.strip().lstrip("#*• -").strip()
        if not line or re.fullmatch(r"(?:v|版本\s*)?2\.\d+(?:\.\d+)*",line,re.I):continue
        if HAN.search(line) and len(line)<=34 and re.search(r"更新|修正|調整|公告|版本|優化",line):
            return line[:34]
    return "遊戲版本更新"
def discord_rows(token):
    out={}
    before=None
    for _ in range(5):
        query={"limit":"100"}
        if before:query["before"]=before
        url=f"https://discord.com/api/v10/channels/{CHANNEL}/messages?"+urllib.parse.urlencode(query)
        messages=get_json(url,token)
        if not isinstance(messages,list):raise RuntimeError("Invalid Discord API response")
        for m in messages:
            raw=[str(m.get("content") or "")]
            for embed in m.get("embeds") or []:
                if not isinstance(embed,dict):continue
                raw.extend([str(embed.get("title") or ""),str(embed.get("description") or "")])
                for field in embed.get("fields") or []:
                    raw.extend([str(field.get("name") or ""),str(field.get("value") or "")])
            original="\n".join(raw)
            match=VERSION.search(original)
            zh=zh_only(original)
            if not match or not zh:continue
            mid=str(m["id"]);version=match.group(1)
            out["discord:"+mid]={
                "id":"discord:"+mid,"version":version,"date":str(m.get("timestamp") or "")[:10],
                "title":title_of(zh,version),"category":"官方更新",
                "sections":sections_of(zh),"details":zh,"language":"zh-Hant",
                "source":"Discord","sourceUrl":f"https://discord.com/channels/{GUILD}/{CHANNEL}/{mid}",
                "discordMessageId":mid,"verifiedSource":True}
        if len(messages)<100:break
        before=str(messages[-1]["id"])
    return out
def apple_row():
    last=None
    for country in ("tw","us"):
        try:
            d=get_json(f"https://itunes.apple.com/lookup?id={APP_ID}&country={country}")
            app=next((r for r in d.get("results",[]) if str(r.get("trackId"))==APP_ID),None)
            if app and app.get("version"):
                last=(country,app)
                if HAN.search(str(app.get("releaseNotes") or "")):break
        except Exception as exc:
            if last is None:raise
    if not last:raise RuntimeError("App Store lookup returned no matching app")
    country,app=last
    version=str(app["version"]).lstrip("vV")
    notes=str(app.get("releaseNotes") or "").strip()
    date=str(app.get("currentVersionReleaseDate") or "")[:10]
    if not notes:notes="App Store 未提供本版本更新說明。"
    chinese=bool(HAN.search(notes))
    return {"id":"appstore:"+version,"version":version,"date":date,
            "title":"App Store 版本更新","category":"官方更新","sections":sections_of(notes),
            "details":notes,"language":"zh-Hant" if chinese else "source-original",
            "source":"App Store","sourceUrl":app.get("trackViewUrl") or f"https://apps.apple.com/tw/app/id{APP_ID}",
            "storeCountry":country.upper(),"verifiedSource":True}
def main():
    token=os.environ.get("DISCORD_BOT_TOKEN","").strip()
    if not token:raise RuntimeError("DISCORD_BOT_TOKEN secret is missing")
    previous={}
    if OUT.exists():
        archive=json.loads(OUT.read_text("utf-8"))
        for r in archive.get("releases",[]):
            if isinstance(r,dict) and r.get("id"):previous[str(r["id"])]=r
    current=discord_rows(token)
    if not current:raise RuntimeError("No matching Chinese Discord releases; previous archive preserved")
    app=apple_row()
    current[app["id"]]=app
    previous.update(current)
    releases=sorted(previous.values(),key=lambda r:(r.get("date",""),r.get("version",""),r.get("id","")),reverse=True)
    result={"schema":48,"source":"Discord + App Store","syncedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
        "discordChannelId":CHANNEL,"appStoreId":APP_ID,"releases":releases}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("R48_SYNC_OK",json.dumps({"discordCurrent":len(current)-1,"archiveTotal":len(releases),
        "latestApple":app["version"],"appCountry":app["storeCountry"],"output":str(OUT)},ensure_ascii=False))
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("R48_SYNC_FAILED:",str(e),file=sys.stderr)
        raise SystemExit(1)
