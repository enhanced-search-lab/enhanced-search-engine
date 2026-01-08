# Enhanced Search Engine for Research Article

**Enhanced Search Engine for Research Article** is an **AI‑driven semantic search and recommendation platform** designed to support academic literature discovery on top of the OpenAlex corpus.

It analyzes one or more **abstracts and/or keyword lists** provided by the user and uses **sentence‑embedding–based semantic similarity**, alongside classical keyword filtering, to find and rerank the most relevant research articles. The web interface returns a structured list of OpenAlex papers with rich metadata, similarity scores, and support for experimental evaluation modes that compare different retrieval pipelines.

Users can turn a successful search into an **email subscription** through a double opt‑in flow. For each verified and active subscription, a scheduled job periodically re‑executes the query on fresh OpenAlex data, filters and reranks candidate papers by semantic similarity, avoids resending previously delivered works, and sends a consolidated recommendation email containing both newly discovered and archive matches.

The system tracks engagement signals such as papers explicitly marked as a **“good match”** from within these emails, as well as optional evaluation feedback from the search interface. These interaction logs are used to monitor and improve the quality of recommendations and provide a foundation for more personalized ranking strategies in future iterations.

## Contributors

**Ceydanur Şen**  
**Nurullah Uçan**
