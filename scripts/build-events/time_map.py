"""Port of src/chart/time.ts (dateToT / yearToDate). MUST stay parity-exact;
guarded by test_time_map.py against src/chart/__fixtures__/time-parity.json."""
from datetime import datetime, timezone
from typing import Union

# ZERO_DATE = Date.UTC(2012, 11, 21, 12, 0, 0)  (month is 0-based in JS → December)
ZERO = datetime(2012, 12, 21, 12, 0, 0, tzinfo=timezone.utc)
_ZERO_MS = ZERO.timestamp() * 1000
DAY_MS = 86_400_000


def date_to_t(d: Union[datetime, float]) -> float:
    """Days from the zero date (positive = past). Mirrors dateToT in time.ts.
    Accepts a datetime or a raw Unix-seconds float (for BCE dates that Python
    datetime cannot represent)."""
    if isinstance(d, datetime):
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        ms = d.timestamp() * 1000
    else:
        ms = d * 1000  # d is already Unix seconds as a float
    return (_ZERO_MS - ms) / DAY_MS


def year_to_date(year: int) -> Union[datetime, float]:
    """Mid-June of an arbitrary (incl. <=0) year, UTC. Mirrors yearToDate in time.ts.
    Returns a datetime for CE years (year >= 1) and a Unix-seconds float for BCE
    years where Python's datetime cannot represent the value."""
    if year >= 1:
        return datetime(2000, 6, 15, tzinfo=timezone.utc).replace(year=year)
    return _astro_year_unix(year)


def _astro_year_unix(year: int) -> float:
    # Python datetime cannot hold year < 1; compute the Unix timestamp directly.
    # Use the proleptic Gregorian mean year length relative to year 1, June 15.
    from datetime import timedelta
    base = datetime(1, 6, 15, tzinfo=timezone.utc)
    delta_days = (year - 1) * 365.2425
    return base.timestamp() + delta_days * 86400
