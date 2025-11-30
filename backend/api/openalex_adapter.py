
class adapt_openalex_work:
    def reconstruct_abstract(inv):
        if not isinstance(inv, dict):
            return inv or ""
        pairs = []
        for token, positions in inv.items():
            for p in positions:
                pairs.append((p, token))
        if not pairs:
            return ""
        pairs.sort(key=lambda x: x[0])
        return " ".join(w for _, w in pairs)

    def adapt_openalex_work(w):
        host_venue   = w.get("host_venue") or {}
        primary_loc  = w.get("primary_location") or {}
        source       = primary_loc.get("source") or {}
        oa           = w.get("open_access") or {}
        best_oa      = w.get("best_oa_location") or {}

        # authors
        authorships  = w.get("authorships") or []
        authors = []
        for a in authorships:
            name = (a or {}).get("author", {}).get("display_name") or ""
            if name:
                authors.append(name)

        # url preference
        url = (
            best_oa.get("url")
            or source.get("url")
            or host_venue.get("url")
            or w.get("openalex")
            or ""
        )

        # abstract
        abstract_text = w.get("abstract") or ""
        if not abstract_text:
            inv = w.get("abstract_inverted_index")
            abstract_text = adapt_openalex_work.reconstruct_abstract(inv) if inv else ""

        cited_by = w.get("cited_by_count", 0)
        refs_cnt = len(w.get("referenced_works") or [])
        rel      = w.get("relevance_score")
        rel_pct  = round(rel * 100) if isinstance(rel, (int, float)) else None

        concepts = []
        for c in (w.get("concepts") or [])[:10]:
            name = (c or {}).get("display_name")
            if name:
                concepts.append(name)

        item = {
            "id": w.get("id") or "",
            "title": w.get("display_name") or "",
            "abstract": abstract_text,
            "url": url,
            "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
            "venue": host_venue.get("display_name") or "",
            "year": w.get("publication_year"),
            "authors": authors,
            "authors_text": ", ".join(authors[:6]),
            "concepts": concepts,
            "tags": [],
            "relevance_pct": rel_pct,
            "cited_by_count": cited_by,
            "references_count": refs_cnt,
            "is_open_access": bool(oa.get("is_oa")),
            "oa_status": oa.get("oa_status") or "",
            "oa_url": best_oa.get("url") or "",
            "score": cited_by,      # legacy
            "created_at": None,
        }

        model_fields = {
            "openalex_id": item["id"],
            "title": item["title"],
            "abstract": item["abstract"],
            "url": item["url"],
            "doi": item["doi"],
            "venue": item["venue"],
            "year": item["year"],
            "authors_text": item["authors_text"],
            "authors_json": authors,
            "concepts": concepts,
            "cited_by_count": cited_by,
            "references_count": refs_cnt,
            "is_open_access": item["is_open_access"],
            "oa_status": item["oa_status"],
            "oa_url": item["oa_url"],
            "relevance_score": rel,
        }
        return item, model_fields
