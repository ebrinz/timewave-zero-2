import json
from datetime import datetime, timezone
from pathlib import Path
from time_map import date_to_t

FIXTURE = Path(__file__).resolve().parents[2] / "src/chart/__fixtures__/time-parity.json"


def test_date_to_t_matches_fixture():
    pairs = json.loads(FIXTURE.read_text())
    for pair in pairs:
        d = datetime.fromisoformat(pair["iso"].replace("Z", "+00:00")).astimezone(timezone.utc)
        assert abs(date_to_t(d) - pair["t"]) < 1e-9, pair


def test_bce_year_handled():
    # Year 1 BCE = astronomical year 0; just assert it is a finite, large positive t.
    from time_map import year_to_date
    t = date_to_t(year_to_date(0))
    assert t > 700_000  # ~2012 years before zero, in days
