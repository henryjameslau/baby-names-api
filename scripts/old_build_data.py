from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
OUT_DIR = ROOT / "static" / "data"
SOURCE_FILE = DATA_DIR / "babynames1996to2024.xlsx"

SEX_SHEETS: List[Tuple[str, str]] = [("Table_1", "girls"), ("Table_2", "boys")]
YEAR_COL_RE = re.compile(r"(\d{4})\s*count", re.IGNORECASE)


def find_header_index(df: pd.DataFrame) -> int:
	for idx in range(len(df.index)):
		row = df.iloc[idx].astype(str).str.lower().tolist()
		if "name" in row and any("count" in cell for cell in row):
			return idx
	return -1


def extract_year_columns(header_row: List[str]) -> Dict[int, int]:
	year_cols: Dict[int, int] = {}
	for i, cell in enumerate(header_row):
		match = YEAR_COL_RE.search(str(cell))
		if match:
			year_cols[int(match.group(1))] = i
	return year_cols


def normalize_name(value: str) -> str:
	return str(value).strip()


def to_number(value) -> float | None:
	if value is None:
		return None
	if isinstance(value, (int, float)):
		if pd.isna(value):
			return None
		return float(value)
	text = str(value).strip()
	if not text:
		return None
	numeric = pd.to_numeric(text, errors="coerce")
	if pd.isna(numeric):
		return None
	return float(numeric)


async def build() -> None:
	OUT_DIR.mkdir(parents=True, exist_ok=True)
	year_map: Dict[int, Dict[str, List[Dict[str, float]]]] = {}

	for sheet_name, sex in SEX_SHEETS:
		frame = pd.read_excel(SOURCE_FILE, sheet_name=sheet_name, header=None, engine="openpyxl")
		header_index = find_header_index(frame)
		if header_index == -1:
			raise RuntimeError(f"Header row not found in {sheet_name}")
		header_row = frame.iloc[header_index].tolist()
		year_cols = extract_year_columns(header_row)

		for row_idx in range(header_index + 1, len(frame.index)):
			row = frame.iloc[row_idx].tolist()
			raw_name = row[0] if row else ""
			name = normalize_name(raw_name)
			if not name:
				continue
			for year, col_idx in year_cols.items():
				count = to_number(row[col_idx] if col_idx < len(row) else None)
				if count is None:
					continue
				year_entry = year_map.setdefault(year, {"year": year, "boys": [], "girls": []})
				year_entry[sex].append({"name": name, "count": int(count)})

	years = sorted(year_map.keys())
	for year in years:
		entry = year_map[year]
		entry["boys"].sort(key=lambda item: (-item["count"], item["name"]))
		entry["girls"].sort(key=lambda item: (-item["count"], item["name"]))
		out_path = OUT_DIR / f"year-{year}.json"
		out_path.write_text(json.dumps(entry), encoding="utf-8")

	meta_path = OUT_DIR / "meta.json"
	meta_path.write_text(json.dumps({"years": years}), encoding="utf-8")
	print(f"Built {len(years)} year files in {OUT_DIR}")


if __name__ == "__main__":
	import asyncio

	asyncio.run(build())
