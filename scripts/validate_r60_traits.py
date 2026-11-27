"""R60: validate only approved table data; reject malformed and oversized submissions."""
import json
from pathlib import Path

EXPECTED = {"max": (20, 12), "trait": (19, 14)}
MAX_BYTES = 128_000

def validate(payload, original=None):
    if not isinstance(payload, dict) or set(payload) != {"schema", "kind", "data"}:
        raise ValueError("Invalid document keys")
    if payload["schema"] != 1 or payload["kind"] != "traits":
        raise ValueError("Invalid schema or kind")
    data = payload["data"]
    if not isinstance(data, dict) or set(data) != set(EXPECTED):
        raise ValueError("Invalid table set")
    for table, (count, columns) in EXPECTED.items():
        entry = data[table]
        if not isinstance(entry, dict) or set(entry) != {"cols", "rows"}:
            raise ValueError(f"Invalid table: {table}")
        cols, rows = entry["cols"], entry["rows"]
        if not isinstance(cols, list) or len(cols) != columns or any(not isinstance(c, str) or not c.strip() or len(c) > 80 for c in cols):
            raise ValueError(f"Invalid column set: {table}")
        if not isinstance(rows, list) or len(rows) != count:
            raise ValueError(f"Invalid row count: {table}")
        for i, row in enumerate(rows):
            if not isinstance(row, list) or len(row) != columns + 2 or any(not isinstance(v, str) or len(v) > 250 for v in row):
                raise ValueError(f"Invalid row: {table}[{i}]")
            if not row[0].strip():
                raise ValueError(f"Empty label: {table}[{i}]")
        if original is not None:
            # The published column layout and row identities must remain stable.
            old = original["data"][table]
            if cols != old["cols"] or [(r[0], r[1]) for r in rows] != [(r[0], r[1]) for r in old["rows"]]:
                raise ValueError(f"Table structure changed: {table}")
    if len(json.dumps(payload, ensure_ascii=False).encode("utf-8")) > MAX_BYTES:
        raise ValueError("Document exceeds size limit")
    return payload

def main():
    path = Path("data/traits.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    validate(payload)
    print("R60_DATA_VALID: 20 maximum-value records, 19 traits, fixed column structure")

if __name__ == "__main__":
    main()
