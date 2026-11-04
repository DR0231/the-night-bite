#!/usr/bin/env python3
"""Flag translation-memory lines where a number in the English is missing from the translation.
Also flags English month abbreviations, ' to ' in ranges, English glosses and bass->perch.
Usage: python3 tools/i18n-numcheck.py [--lang xx] [--kind num,month,to,gloss,bass,ratio] [--tsv]
Exit 1 if any 'num' issue found."""
import argparse, glob, hashlib, json, re, statistics, sys, pathlib
R = pathlib.Path(__file__).resolve().parent.parent / "data/i18n"
def norm(s): return re.sub(r"\s+", " ", s).strip()
def en_map():
    m = {}
    for f in glob.glob(str(R / "pages/*.en.json")):
        for k, v in json.load(open(f))["strings"].items(): m[k.split(".")[-1]] = v
    return m
MON = "Jan|Feb|Mar|Apr|May|Jun|June|Jul|July|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|August|September|October|November|December"
LATIN = {"de","es","fr","it","pt","pl","ht","tl","vi"}
NUM = re.compile(r"\d+(?:[.,:]\d+)?")
TRANS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹०१२३४५६७८९", "0123456789"*3)
def nums(s): return [n.replace(",", "") for n in NUM.findall(s)]
def num_issue(en, tr):
    t = tr.translate(TRANS); tn = set(nums(t)) | set(n.replace(".", "") for n in nums(t))
    t = re.sub(r"(\d)\s?h\s?(\d\d)", r"\1:\2", t)
    tj = re.sub(r"(?<=\d)[ \u00a0\u202f,.](?=\d{3}\b)", "", t).replace(",", "")
    miss = []
    for n in nums(en):
        if n in tn or n in tj: continue
        if re.search(rf"(?<![\d.]){re.escape(n)}\s*(p\.m\.|pm)", en) and n.isdigit() and str(int(n) % 12 + 12) in tj: continue
        if n == "3" and re.search(r"3-way", en) and not re.search(r"(?<!\d)3(?!-way)\b", re.sub(r"3-way", "", en)): continue
        if ":" in n and re.search(rf"{re.escape(n)}\s*(p\.m\.|pm)", en) and f"{int(n.split(':')[0]) % 12 + 12}:{n.split(':')[1]}" in tj: continue
        if ":" in n and all(p.lstrip("0") in tj or p in tj for p in n.split(":")): continue
        if re.fullmatch(r"0?\d[.,]\d+", n) and n.replace(".", ",") in t: continue
        miss.append(n)
    return miss
# Fragment merges checked by hand: the number renders from a neighbouring fragment.
OK = {"ja": {"7e24cd7c"}, "zh": {"7e24cd7c", "2f5d44c3"}}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--lang"); ap.add_argument("--kind", default="num,month,to,gloss,bass,ratio,frag"); ap.add_argument("--tsv", action="store_true")
    a = ap.parse_args(); kinds = set(a.kind.split(",")); en = en_map(); bad = 0
    for f in sorted(glob.glob(str(R / "tm/*.json"))):
        l = pathlib.Path(f).stem
        if a.lang and l != a.lang: continue
        S = json.load(open(f))["strings"]; ratios = {}
        for h, tr in S.items():
            e = en.get(h)
            if e is None: continue
            out = []
            if "num" in kinds and h not in OK.get(l, ()):
                m = num_issue(e, tr)
                if m: out.append(("num", ",".join(m))); bad += 1
            if "month" in kinds and re.search(rf"\b({MON})\.?\s+\d", tr) and l not in {"de"} | set():
                if not (l in LATIN and re.search(rf"\b({MON})\b", tr) and re.search(rf"\b({MON})\b", e) and l in {"fr"}):
                    out.append(("month", re.search(rf"\b({MON})\.?\s+\d+", tr).group(0)))
            if "to" in kinds and re.search(r"\d\s+to\s+\d", tr): out.append(("to", re.search(r"\S*\d\s+to\s+\d\S*", tr).group(0)))
            GL = rf"[（(][^）)]*(?:\b(?:{MON})\.?\s*\d|a\.m\.|p\.m\.|3-way|\bover\b|″超)[^）)]*[）)]"
            if "gloss" in kinds and l not in LATIN and re.search(GL, tr) and not re.search(GL, e):
                out.append(("gloss", re.search(GL, tr).group(0)))
            if "gloss" in kinds and l not in LATIN and re.search(rf"\b({MON})\.\s*\d|\b[ap]\.m\.", tr):
                out.append(("enword", re.search(rf"\b({MON})\.\s*\d+|\b[ap]\.m\.", tr).group(0)))
            if "frag" in kinds and tr.strip() in ("。", ".", "、", "،", "۔", "।") : out.append(("frag", repr(tr)))
            if "bass" in kinds and re.search(r"\bbass\b", e, re.I) and re.search(r"okoń|okoni|perche|persico|perch|окун(?!ь-?|ев[ыи]е)", tr, re.I) and "perch" not in e.lower():
                out.append(("bass", tr[:60]))
            if "ratio" in kinds and len(e) > 25: ratios[h] = len(tr) / len(e)
            for k, v in out:
                print(f"{l}\t{k}\t{h}\t{v}\t{norm(e)[:90]}\t{norm(tr)[:90]}" if a.tsv else f"{l} {k} {h}: {v} | EN: {norm(e)[:80]} | TR: {norm(tr)[:80]}")
        if ratios and "ratio" in kinds:
            med = statistics.median(ratios.values())
            for h, r in ratios.items():
                if r < med * 0.35 or r > med * 2.8:
                    print(f"{l}\tratio\t{h}\t{r/med:.2f}\t{norm(en[h])[:90]}\t{norm(S[h])[:90]}" if a.tsv else f"{l} ratio {h}: {r/med:.2f}x | EN: {norm(en[h])[:80]} | TR: {norm(S[h])[:80]}")
    sys.exit(1 if bad else 0)
if __name__ == "__main__": main()
