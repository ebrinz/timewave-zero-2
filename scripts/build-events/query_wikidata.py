"""Fetch notable, dated events from the Wikidata Query Service.
Run offline; output is committed. WDQS requires a descriptive User-Agent."""
import sys
import time
import requests

ENDPOINT = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "timewave-zero-2 events pipeline (https://github.com/ebrinz/timewave-zero-2)",
    "Accept": "application/sparql-results+json",
}
# Broad, fast query: any item with a point-in-time + a notability floor + an en
# Wikipedia article. Calendar-period entities (years/decades/centuries) that swamp
# the top sitelinks are filtered out in Python (see build_events.main / is_calendar_label)
# — the SPARQL-side type filters (occurrence subtree, or FILTER NOT EXISTS) time out on WDQS.
SPARQL = """
SELECT ?event ?eventLabel ?date ?article ?sitelinks ?desc WHERE {
  ?event wdt:P585 ?date .
  ?event wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= 40)
  ?article schema:about ?event ;
           schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?event schema:description ?desc . FILTER(LANG(?desc) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 8000
"""


def fetch_raw(retries: int = 3):
    """Return a list of raw event dicts: {id, iso, title, summary, url, sitelinks}.
    Retries on transient WDQS 5xx/timeouts."""
    last = None
    for attempt in range(retries):
        try:
            resp = requests.get(ENDPOINT, params={"query": SPARQL}, headers=HEADERS, timeout=180)
            resp.raise_for_status()
            break
        except requests.exceptions.RequestException as e:  # noqa: PERF203
            last = e
            print(f"WDQS attempt {attempt + 1}/{retries} failed: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    else:
        raise last
    rows = resp.json()["results"]["bindings"]
    out, seen = [], set()
    for r in rows:
        qid = r["event"]["value"].rsplit("/", 1)[-1]
        if qid in seen:
            continue
        seen.add(qid)
        out.append({
            "id": qid,
            "iso": r["date"]["value"],                 # e.g. 1945-08-06T00:00:00Z
            "title": r.get("eventLabel", {}).get("value", qid),
            "summary": r.get("desc", {}).get("value", ""),
            "url": r["article"]["value"],
            "sitelinks": int(r["sitelinks"]["value"]),
        })
    return out


if __name__ == "__main__":
    data = fetch_raw()
    print(f"fetched {len(data)} events", file=sys.stderr)
    for e in data[:5]:
        print(e["sitelinks"], e["title"], e["iso"], file=sys.stderr)
