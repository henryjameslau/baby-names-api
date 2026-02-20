from __future__ import annotations

import json
from pathlib import Path
import re
from urllib.parse import quote

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
OUT_DIR = ROOT / "static" / "api"

ANNUAL_FILE = DATA_DIR / "babynames1996to2024.xlsx"
HISTORICAL_FILE = DATA_DIR / "historicalnames2024.xlsx"

SEX_SHEETS = [
    ("Table_1", "girls"),
    ("Table_2", "boys"),
]

YEAR_COL_RE = re.compile(r"(\d{4})\s*count", re.IGNORECASE)
BRACKET_TOKEN_RE = re.compile(r"\s*\[[^\]]+\]\s*")


def find_header_index(df: pd.DataFrame) -> int:
    for i in range(len(df.index)):
        row = df.iloc[i].astype(str).str.lower().tolist()
        if "name" in row and any("count" in value for value in row):
            return i
    return -1


def normalize_name(value: object) -> str:
    raw = str(value).strip()
    if not raw:
        return ""
    cleaned = BRACKET_TOKEN_RE.sub("", raw).strip()
    if not cleaned:
        return ""
    if cleaned.lower() == "[x]":
        return ""
    if cleaned.lower() in {"nan", "none"}:
        return ""
    return cleaned


def normalize_key(value: object) -> str:
    return normalize_name(value).lower()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def coerce_int(value: object) -> int | None:
    try:
        if value is None:
            return None
        if isinstance(value, str) and value.strip().lower() == "[x]":
            return None
        number = pd.to_numeric(value, errors="coerce")
        if pd.isna(number):
            return None
        return int(number)
    except Exception:
        return None


def add_entry(year_map: dict[int, dict], year: int, sex: str, name: str, count: int | None) -> None:
    year_entry = year_map.setdefault(year, {"year": year, "boys": [], "girls": []})
    year_entry[sex].append({"name": name, "count": count})


def process_annual_workbook(year_map: dict[int, dict]) -> None:
    for sheet, sex in SEX_SHEETS:
        df = pd.read_excel(ANNUAL_FILE, sheet_name=sheet, header=None, dtype=object)
        header_index = find_header_index(df)
        if header_index == -1:
            raise RuntimeError(f"Header row not found in {sheet}")

        header_row = df.iloc[header_index].astype(str).tolist()
        data = df.iloc[header_index + 1 :].copy()
        data.columns = header_row

        year_columns: dict[int, str] = {}
        for column in data.columns:
            match = YEAR_COL_RE.search(str(column))
            if match:
                year_columns[int(match.group(1))] = column

        names = data["Name"].astype(str).map(normalize_name)
        for year, column in year_columns.items():
            counts = pd.to_numeric(data[column], errors="coerce")
            for name, count in zip(names, counts):
                if not name:
                    continue
                if pd.isna(count):
                    continue
                add_entry(year_map, year, sex, name, int(count))


def find_historical_header(rows: list[list[object]]) -> int:
    for i, row in enumerate(rows[:20]):
        first = str(row[0]).strip().lower() if row else ""
        if first == "rank":
            return i
    return -1


def process_historical_workbook(year_map: dict[int, dict]) -> None:
    for sheet, sex in SEX_SHEETS:
        df = pd.read_excel(HISTORICAL_FILE, sheet_name=sheet, header=None, dtype=object)
        rows = df.values.tolist()
        header_index = find_historical_header(rows)
        if header_index == -1:
            raise RuntimeError(f"Header row not found in historical {sheet}")

        header = rows[header_index]
        years = []
        for idx, value in enumerate(header[1:], start=1):
            try:
                year = int(str(value).strip())
                years.append((idx, year))
            except Exception:
                continue

        for row in rows[header_index + 1 :]:
            try:
                rank_value = int(str(row[0]).strip())
            except Exception:
                continue
            if rank_value <= 0:
                continue
            for col_idx, year in years:
                name = normalize_name(row[col_idx] if col_idx < len(row) else "")
                if not name:
                    continue
                existing = year_map.get(year)
                if existing and existing.get(sex):
                    continue
                add_entry(year_map, year, sex, name, None)


def find_geo_header(rows: list[list[object]]) -> int:
    for i, row in enumerate(rows[:30]):
        lowered = [str(cell).strip().lower() for cell in row]
        if "area of usual residence code" in lowered:
            return i
    return -1


def split_top_names(value: object) -> list[str]:
    text = normalize_name(value)
    if not text:
        return []
    parts = [normalize_name(part) for part in str(text).split(",")]
    return [part for part in parts if part]


def process_geo_workbooks() -> dict[str, list[int]]:
    geo_years: dict[str, set[int]] = {"boys": set(), "girls": set()}
    for path in DATA_DIR.iterdir():
        if not path.suffix.lower() in {".xls", ".xlsx"}:
            continue
        filename = path.name.lower()
        if "boys" in filename:
            sex = "boys"
        elif "girls" in filename:
            sex = "girls"
        else:
            continue
        match = re.search(r"(\d{4})", filename)
        if not match:
            continue
        year = int(match.group(1))
        if year < 2017:
            continue

        try:
            xls = pd.ExcelFile(path)
            if "Table_7" not in xls.sheet_names:
                continue
        except Exception:
            continue

        df = pd.read_excel(path, sheet_name="Table_7", header=None, dtype=object)
        rows = df.values.tolist()
        header_index = find_geo_header(rows)
        if header_index == -1:
            continue

        data_rows = rows[header_index + 1 :]
        areas = []
        for row in data_rows:
            if not row or all(pd.isna(cell) or str(cell).strip() == "" for cell in row):
                continue
            code = str(row[0]).strip() if len(row) > 0 else ""
            area_name = str(row[1]).strip() if len(row) > 1 else ""
            geography = str(row[2]).strip() if len(row) > 2 else ""
            top_names = split_top_names(row[3] if len(row) > 3 else "")
            count = coerce_int(row[4] if len(row) > 4 else None)
            if not area_name or not top_names:
                continue
            areas.append(
                {
                    "code": code,
                    "areaName": area_name,
                    "geography": geography,
                    "topNames": top_names,
                    "count": count,
                }
            )

        if not areas:
            continue
        geo_years[sex].add(year)
        out_path = OUT_DIR / "geo" / str(year) / f"{sex}.json"
        write_json(out_path, {"year": year, "sex": sex, "areas": areas})

    return {key: sorted(values) for key, values in geo_years.items()}


def build_ranked_entries(entries: list[dict]) -> list[dict]:
    has_counts = any(entry.get("count") is not None for entry in entries)
    result = []
    last_count = None
    rank = 0
    position = 0
    for entry in entries:
        if has_counts and entry.get("count") is None:
            continue
        position += 1
        if has_counts:
            count = entry.get("count") or 0
            if last_count is None or count < last_count:
                rank = position
                last_count = count
        else:
            rank = position
        result.append({"rank": rank, "name": entry.get("name"), "count": entry.get("count")})
    return result


def build_name_series(year_map: dict[int, dict]) -> tuple[dict[str, dict], dict[int, dict]]:
    name_series: dict[str, dict[str, dict]] = {"boys": {}, "girls": {}}
    top_by_year: dict[int, dict[str, list[dict]]] = {}
    years = sorted(year_map.keys())
    for year in years:
        entry = year_map[year]
        top_by_year[year] = {}
        for sex in ("boys", "girls"):
            ranked = build_ranked_entries(entry.get(sex, []))
            top_by_year[year][sex] = ranked
            for item in ranked:
                key = normalize_key(item.get("name"))
                if not key:
                    continue
                series_entry = name_series[sex].setdefault(
                    key,
                    {"name": item.get("name"), "slug": quote(key, safe=""), "series": []},
                )
                series_entry["series"].append(
                    {"year": year, "count": item.get("count"), "rank": item.get("rank")}
                )
    return name_series, top_by_year


def build_names_lists(name_series: dict[str, dict[str, dict]]) -> None:
    all_names: dict[str, dict] = {}
    for sex in ("boys", "girls"):
        entries = []
        for key, data in name_series[sex].items():
            entry = {"name": data["name"], "slug": data["slug"]}
            entries.append(entry)
            all_names.setdefault(key, entry)
        entries.sort(key=lambda item: item["name"].lower())
        write_json(OUT_DIR / "names" / f"{sex}.json", entries)

    all_list = sorted(all_names.values(), key=lambda item: item["name"].lower())
    write_json(OUT_DIR / "names" / "all.json", all_list)


def build_name_files(name_series: dict[str, dict[str, dict]]) -> None:
    combined: dict[str, dict] = {}
    for sex in ("boys", "girls"):
        for key, data in name_series[sex].items():
            combined_entry = combined.setdefault(
                key,
                {"name": data["name"], "slug": data["slug"], "boys": [], "girls": []},
            )
            combined_entry[sex] = data["series"]

    for entry in combined.values():
        write_json(OUT_DIR / "name" / f"{entry['slug']}.json", entry)


def build_top_files(top_by_year: dict[int, dict[str, list[dict]]]) -> None:
    for year, entry in top_by_year.items():
        write_json(
            OUT_DIR / "top" / f"{year}.json",
            {
                "year": year,
                "boys": entry["boys"],
                "girls": entry["girls"],
            },
        )


def linear_regression(points: list[tuple[int, int]]) -> tuple[float, float]:
    n = len(points)
    sum_x = sum(point[0] for point in points)
    sum_y = sum(point[1] for point in points)
    sum_xy = sum(point[0] * point[1] for point in points)
    sum_xx = sum(point[0] * point[0] for point in points)
    denominator = n * sum_xx - sum_x * sum_x
    if denominator == 0:
        return 0.0, sum_y / n
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def update_neighbors(neighbors: list[dict], candidate: dict, limit: int) -> None:
    neighbors.append(candidate)
    if len(neighbors) > limit * 4:
        neighbors.sort(key=lambda item: item["sse"])
        del neighbors[limit:]


def build_similarity_files(
    name_series: dict[str, dict[str, dict]],
    min_years: int = 5,
    limit: int = 10,
    max_candidates: int = 2000,
) -> None:
    def range_stats(start: int, end: int) -> tuple[int, float, float]:
        n = end - start + 1
        if n <= 0:
            return 0, 0.0, 0.0
        sum_x = n * (start + end) / 2
        sum_xx = (end * (end + 1) * (2 * end + 1) - (start - 1) * start * (2 * (start - 1) + 1)) / 6
        return n, float(sum_x), float(sum_xx)

    for sex in ("boys", "girls"):
        series_entries = []
        series_map = {}
        for key, data in name_series[sex].items():
            ranks = [
                {"year": entry["year"], "rank": entry["rank"]}
                for entry in data["series"]
                if entry.get("rank") is not None
            ]
            if not ranks:
                continue
            ranks.sort(key=lambda item: item["year"])
            points = [(entry["year"], entry["rank"]) for entry in ranks]
            slope, intercept = linear_regression(points)
            series_map[key] = {
                "name": data["name"],
                "slug": data["slug"],
                "ranks": ranks,
                "minYear": ranks[0]["year"],
                "maxYear": ranks[-1]["year"],
                "yearCount": len(ranks),
                "slope": slope,
                "intercept": intercept,
            }
            series_entries.append(
                {
                    "name": data["name"],
                    "slug": data["slug"],
                    "yearCount": len(ranks),
                    "minYear": ranks[0]["year"],
                    "maxYear": ranks[-1]["year"],
                }
            )
            write_json(
                OUT_DIR / "similar" / "series" / sex / f"{data['slug']}.json",
                {"name": data["name"], "sex": sex, "ranks": ranks},
            )

        series_entries.sort(key=lambda item: item["name"].lower())
        write_json(OUT_DIR / "similar" / f"index-{sex}.json", series_entries)

        keys = list(series_map.keys())
        keys.sort(key=lambda key: series_map[key]["yearCount"], reverse=True)
        candidate_keys = keys[:max_candidates]
        neighbor_map = {key: [] for key in keys}

        for i in range(len(candidate_keys)):
            key_a = candidate_keys[i]
            data_a = series_map[key_a]
            for j in range(i + 1, len(candidate_keys)):
                key_b = candidate_keys[j]
                data_b = series_map[key_b]
                overlap_start = max(data_a["minYear"], data_b["minYear"])
                overlap_end = min(data_a["maxYear"], data_b["maxYear"])
                overlap_years, sum_x, sum_xx = range_stats(overlap_start, overlap_end)
                if overlap_years < min_years:
                    continue
                dm = data_a["slope"] - data_b["slope"]
                db = data_a["intercept"] - data_b["intercept"]
                sse = dm * dm * sum_xx + 2 * dm * db * sum_x + db * db * overlap_years
                candidate_a = {
                    "name": data_b["name"],
                    "slug": data_b["slug"],
                    "sse": sse,
                    "overlapYears": overlap_years,
                }
                candidate_b = {
                    "name": data_a["name"],
                    "slug": data_a["slug"],
                    "sse": sse,
                    "overlapYears": overlap_years,
                }
                update_neighbors(neighbor_map[key_a], candidate_a, limit)
                update_neighbors(neighbor_map[key_b], candidate_b, limit)

        for key, neighbors in neighbor_map.items():
            data = series_map[key]
            neighbors.sort(key=lambda item: item["sse"])
            payload = {
                "name": data["name"],
                "slug": data["slug"],
                "sex": sex,
                "minYears": min_years,
                "neighbors": neighbors[:limit],
            }
            write_json(OUT_DIR / "similar" / sex / f"{data['slug']}.json", payload)


def sort_entries(entries: list[dict]) -> None:
    if any(entry.get("count") is not None for entry in entries):
        entries.sort(key=lambda item: (-item["count"], item["name"]))


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    year_map: dict[int, dict] = {}

    process_annual_workbook(year_map)
    process_historical_workbook(year_map)

    years = sorted(year_map.keys())
    for year in years:
        entry = year_map[year]
        sort_entries(entry["boys"])
        sort_entries(entry["girls"])
        write_json(OUT_DIR / "year" / f"{year}.json", entry)

    geo_years = process_geo_workbooks()
    name_series, top_by_year = build_name_series(year_map)
    build_names_lists(name_series)
    build_name_files(name_series)
    build_top_files(top_by_year)
    build_similarity_files(name_series)
    write_json(OUT_DIR / "meta.json", {"years": years, "geoYears": geo_years})
    print(f"Built {len(years)} year files in {OUT_DIR}")


if __name__ == "__main__":
    build()
