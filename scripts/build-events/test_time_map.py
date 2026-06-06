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
    # Year 1 BCE = astronomical year 0; ~735058 days before zero in JS.
    # Allow ±10 days: _astro_year_unix uses the mean Gregorian year (365.2425),
    # which diverges from the exact JS value by ~18h for year 0. This window is
    # tight enough to catch a formula inversion / wrong base year.
    from time_map import year_to_date
    t = date_to_t(year_to_date(0))
    assert 735_050 < t < 735_070
