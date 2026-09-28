#!/usr/bin/env python3
"""JPX（日本取引所グループ）の「東証上場銘柄一覧」から、検索用の銘柄一覧を作る。

    python3 scripts/fetch-jp-stocks.py   # → src/data/jp-stocks.json

GitHub Actions（research-data.yml）が月1回実行してコミットする。
一覧は Excel（.xls）なので xlrd で読む。取得に失敗したら既存のファイルは変えずに異常終了する。
"""
import datetime
import io
import json
import pathlib
import sys
import urllib.request

import xlrd

URL = "https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls"
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "jp-stocks.json"


def main() -> int:
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (research-dashboard)"})
    with urllib.request.urlopen(req, timeout=60) as res:
        book = xlrd.open_workbook(file_contents=res.read())
    sheet = book.sheet_by_index(0)
    header = [str(c).strip() for c in sheet.row_values(0)]
    col = {name: header.index(name) for name in ("日付", "コード", "銘柄名", "市場・商品区分", "33業種区分")}

    rows = []
    as_of = None
    for r in range(1, sheet.nrows):
        v = sheet.row_values(r)
        code = v[col["コード"]]
        code = str(int(code)) if isinstance(code, float) else str(code).strip()
        market = str(v[col["市場・商品区分"]]).strip()
        # 株式・ETF・REIT だけを残す（PRO Market や出資証券は外す）
        if "株式" in market:
            market = market.split("（")[0]
        elif market.startswith("ETF"):
            market = "ETF"
        elif market.startswith("REIT"):
            market = "REIT"
        else:
            continue
        sector = str(v[col["33業種区分"]]).strip()
        rows.append([code, str(v[col["銘柄名"]]).strip(), market, "" if sector in ("-", "") else sector])
        as_of = as_of or str(v[col["日付"]]).split(".")[0]

    if len(rows) < 3000:
        print(f"銘柄数が少なすぎます（{len(rows)}件）。一覧の形式が変わった可能性があります", file=sys.stderr)
        return 1

    rows.sort(key=lambda x: x[0])
    as_of_iso = None
    if as_of and len(as_of) == 8 and as_of.isdigit():
        as_of_iso = f"{as_of[:4]}-{as_of[4:6]}-{as_of[6:]}"
    data = {
        "source": "JPX 東証上場銘柄一覧",
        "asOf": as_of_iso or datetime.date.today().isoformat(),
        "columns": ["code", "name", "market", "sector"],
        "rows": rows,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(rows)}銘柄を書き出しました（{data['asOf']} 時点）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
