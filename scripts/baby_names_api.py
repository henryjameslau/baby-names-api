"""
Python client functions for the England & Wales Baby Names API.

The API is a static JSON API. All endpoints are GET requests.
Base URL defaults to the deployed Netlify site; override via BASE_URL env var
or by passing base_url to each function.

Endpoint overview
-----------------
GET /api/meta.json
    Available years and geography years.

GET /api/names/all.json
GET /api/names/boys.json
GET /api/names/girls.json
    Full name lists with slugs.

GET /api/year/{year}.json
    All names + counts for a given year.

GET /api/top/{year}.json
    Ranked top names for a given year.

GET /api/name/{slug}.json
    Time-series data (count + rank per year) for a single name.

GET /api/geo/{year}/{sex}.json
    Geographic breakdown of top names for a given year and sex.

GET /api/similar/{sex}/{slug}.json
    Precomputed similar names for a given name and sex.
"""

import os
import urllib.request
import urllib.error
import json
from typing import Literal

BASE_URL = os.environ.get("BABY_NAMES_BASE_URL", "https://ons-baby-names-api.netlify.app")

Sex = Literal["boys", "girls"]


def _get(path: str, base_url: str = BASE_URL) -> dict | list:
    """Fetch a JSON endpoint and return the parsed response."""
    url = f"{base_url.rstrip('/')}{path}"
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        raise ValueError(f"HTTP {e.code} fetching {url}") from e
    except urllib.error.URLError as e:
        raise ConnectionError(f"Could not reach {url}: {e.reason}") from e


def get_meta(base_url: str = BASE_URL) -> dict:
    """Return available years and geography years.

    Returns:
        {
            "years": [1904, ..., 2025],
            "geoYears": {"boys": [...], "girls": [...]}
        }
    """
    return _get("/api/meta.json", base_url)


def get_names(sex: Sex | Literal["all"] = "all", base_url: str = BASE_URL) -> list[dict]:
    """Return the full list of names (and their URL slugs).

    Args:
        sex: "all", "boys", or "girls"

    Returns:
        [{"name": "Oliver", "slug": "oliver"}, ...]
    """
    if sex not in ("all", "boys", "girls"):
        raise ValueError(f"sex must be 'all', 'boys', or 'girls', got {sex!r}")
    return _get(f"/api/names/{sex}.json", base_url)


def get_year(year: int, base_url: str = BASE_URL) -> dict:
    """Return all names and counts registered in a given year.

    Args:
        year: A year available in get_meta()["years"]

    Returns:
        {
            "year": 2024,
            "boys": [{"name": "...", "count": 123}, ...],
            "girls": [{"name": "...", "count": 123}, ...]
        }
        Note: historical decade entries may have count: null (rank only).
    """
    return _get(f"/api/year/{year}.json", base_url)


def get_top(year: int, base_url: str = BASE_URL) -> dict:
    """Return the ranked top names for a given year.

    Args:
        year: A year available in get_meta()["years"]

    Returns:
        {
            "year": 2024,
            "boys": [{"rank": 1, "name": "...", "count": 123}, ...],
            "girls": [{"rank": 1, "name": "...", "count": 123}, ...]
        }
    """
    return _get(f"/api/top/{year}.json", base_url)


def get_name(slug: str, base_url: str = BASE_URL) -> dict:
    """Return the time-series (count + rank per year) for a single name.

    Args:
        slug: URL slug for the name, e.g. "oliver" or "a%27isha".
              Use the slug from get_names() rather than constructing manually.

    Returns:
        {
            "name": "Oliver",
            "slug": "oliver",
            "boys": [{"year": 1996, "count": 3655, "rank": 23}, ...],
            "girls": [{"year": 2001, "count": 12, "rank": 450}, ...]
        }
        count may be null for historical decade entries.
    """
    return _get(f"/api/name/{slug}.json", base_url)


def get_geo(year: int, sex: Sex, base_url: str = BASE_URL) -> dict:
    """Return geographic breakdown of top names for a year and sex.

    Args:
        year: A year available in get_meta()["geoYears"][sex]
        sex:  "boys" or "girls"

    Returns:
        {
            "year": 2024,
            "sex": "boys",
            "areas": [
                {
                    "code": "E06000001",
                    "areaName": "Hartlepool",
                    "geography": "Unitary Authority",
                    "topNames": ["Alfie"],
                    "count": 15
                },
                ...
            ]
        }
    """
    if sex not in ("boys", "girls"):
        raise ValueError(f"sex must be 'boys' or 'girls', got {sex!r}")
    return _get(f"/api/geo/{year}/{sex}.json", base_url)


def get_similar(slug: str, sex: Sex, base_url: str = BASE_URL) -> dict:
    """Return precomputed similar names for a given name and sex.

    Similarity is based on rank trajectory over time (sum of squared errors).

    Args:
        slug: URL slug for the name (from get_names())
        sex:  "boys" or "girls"

    Returns:
        {
            "name": "Oliver",
            "slug": "oliver",
            "sex": "boys",
            "minYears": 10,
            "neighbors": [
                {"name": "Jack", "slug": "jack", "sse": 1234.5, "overlapYears": 28},
                ...
            ]
        }
    """
    if sex not in ("boys", "girls"):
        raise ValueError(f"sex must be 'boys' or 'girls', got {sex!r}")
    return _get(f"/api/similar/{sex}/{slug}.json", base_url)


# ---------------------------------------------------------------------------
# Convenience helpers
# ---------------------------------------------------------------------------

def search_names(query: str, sex: Sex | Literal["all"] = "all", base_url: str = BASE_URL) -> list[dict]:
    """Return names whose display name contains *query* (case-insensitive).

    Args:
        query: Substring to search for, e.g. "oli"
        sex:   Restrict to "boys", "girls", or search "all"

    Returns:
        [{"name": "Oliver", "slug": "oliver"}, ...]
    """
    names = get_names(sex, base_url)
    q = query.lower()
    return [n for n in names if q in n["name"].lower()]


def get_latest_year(base_url: str = BASE_URL) -> int:
    """Return the most recent year available in the dataset."""
    meta = get_meta(base_url)
    return max(meta["years"])
