#!/usr/bin/env python3
"""
Convert the backend's db/seed/*.csv files into compact JSON for the
frontend's mock data layer (lib/mock/seed/).

Usage:
    python3 scripts/convert_seed.py /path/to/backend/db/seed

Values are typed per column: true/false -> bool, numbers -> int/float,
empty -> null. Re-run whenever the backend regenerates its dataset.
"""
import csv
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "lib" / "mock" / "seed"
TABLES = [
    "area_reference", "funding_cycles", "caseworkers", "households",
    "household_surveys", "protected_attributes", "applications",
    "application_reviews", "awards",
]
BOOLS = {"true", "false"}
# Identifier-like columns that must stay strings even if they look numeric.
KEEP_STRING = {"household_id", "area_code", "age_band"}


def is_int(v):
    try:
        int(v)
        return "." not in v and "e" not in v.lower()
    except ValueError:
        return False


def is_float(v):
    try:
        float(v)
        return True
    except ValueError:
        return False


def column_kind(name, values):
    vals = [v for v in values if v != ""]
    if name in KEEP_STRING or not vals:
        return "str"
    if all(v.lower() in BOOLS for v in vals):
        return "bool"
    if all(is_int(v) for v in vals):
        return "int"
    if all(is_float(v) for v in vals):
        return "float"
    return "str"


def convert(value, kind):
    if value == "":
        return None
    if kind == "bool":
        return value.lower() == "true"
    if kind == "int":
        return int(value)
    if kind == "float":
        return float(value)
    return value


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    seed_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for table in TABLES:
        with open(seed_dir / f"{table}.csv", newline="") as f:
            rows = list(csv.DictReader(f))
        kinds = {c: column_kind(c, [r[c] for r in rows]) for c in rows[0]}
        columns = list(rows[0])
        data = [[convert(r[c], kinds[c]) for c in columns] for r in rows]
        # Columnar layout keeps the files close to CSV size; lib/mock/load.ts
        # turns them back into objects.
        payload = {"columns": columns, "rows": data}
        (OUT / f"{table}.json").write_text(json.dumps(payload, separators=(",", ":")))
        print(f"{table:22} {len(data):6} rows  "
              + ", ".join(f"{c}:{k}" for c, k in kinds.items() if k != "str")[:160])


if __name__ == "__main__":
    main()
