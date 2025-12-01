from typing import Dict, Any, List, Optional, Tuple
import requests

OPENALEX_BASE_URL = "https://api.openalex.org"


def inverted_abstract_to_text(inv: Optional[Dict[str, List[int]]]) -> Optional[str]:
    """
    Converts OpenAlex 'abstract_inverted_index' into normal text.
    """
    if not inv:
        return None
    size = max(pos for positions in inv.values() for pos in positions) + 1
    words = [""] * size
    for word, positions in inv.items():
        for pos in positions:
            words[pos] = word
    return " ".join(words)


def work_to_text_fields(work: Dict[str, Any]) -> Tuple[str, str, str, str]:
    """
    From a single OpenAlex work record, returns:
    - work_id (W123...)
    - title (string)
    - abstract_text (string)
    - topics_text (ONLY topics)
    - concepts_text (display_name list)

    NOTE:
    ★ NEVER use the 'keywords' field!
    ★ topic = only work["topics"]
    """
    # Work ID
    raw_id: str = work["id"]                       # 'https://openalex.org/W3038568908'
    work_id = raw_id.split("/")[-1]                # 'W3038568908'

    # Title
    title = work.get("title") or ""

    # Abstract
    abstract_text = inverted_abstract_to_text(
        work.get("abstract_inverted_index")
    ) or ""

    # Topics (only the topics field)
    topics_list = []
    for t in work.get("topics", []):
        name = t.get("display_name")
        if name:
            topics_list.append(name)
    topics_text = "; ".join(topics_list)

    # Concepts
    concept_names = []
    for c in work.get("concepts", []):
        name = c.get("display_name")
        if name:
            concept_names.append(name)
    concepts_text = "; ".join(concept_names)

    return work_id, title, abstract_text, topics_text, concepts_text


def fetch_works_page(
    cursor: str = "*",
    per_page: int = 200,
    from_publication_date: str | None = None,
    to_publication_date: str | None = None,
):
    """
    Fetches a page using filters language:en,has_abstract:true.
    Additionally supports last-week date filtering via
    from_publication_date / to_publication_date parameters.
    """
    url = f"{OPENALEX_BASE_URL}/works"

    # Base filters
    filters = ["language:en", "has_abstract:true"]

    # Date filters
    if from_publication_date:
        filters.append(f"from_publication_date:{from_publication_date}")
    if to_publication_date:
        filters.append(f"to_publication_date:{to_publication_date}")

    params = {
        "per_page": per_page,
        "cursor": cursor,
        "filter": ",".join(filters),
        "sort": "cited_by_count:desc",
        "mailto": "your@mail.com"  # required for polite pool
    }

    resp = requests.get(url, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()
