import re, html, nltk
from nltk.corpus import stopwords

# NLTK stopwords (downloaded on first run)
nltk.download("stopwords", quiet=True)
STOP_EN = set(stopwords.words("english"))  # English stopwords
MIN_TOKEN_LEN = 2
HYphen_TOKEN_RX = re.compile(r"^[a-z]+(?:-[a-z]+)*$")  # keep hyphenated words


def strip_punct(token: str) -> str:
    return token.strip(".,;:!?()[]{}\"'")  # trim punctuation


def preprocess_text(text: str) -> str:
    text = html.unescape(text)                               # decode HTML
    text = re.sub(r"<[^>]+>", " ", text)                     # remove tags
    text = re.sub(r"https?://\S+|doi:\S+|arxiv:\S+", " ", text)  # remove links
    text = re.sub(r"\[[0-9]+\]", " ", text)                  # remove [12]
    text = re.sub(r"\(([^()]*\d{4}[^()]*)\)", " ", text)     # remove (Smith, 2021)
    text = re.sub(r"`[^`]*`", " ", text)                     # remove `code`
    text = re.sub(r"[^a-zA-Z\s.,;:!?()\-]", " ", text)       # remove symbols
    text = re.sub(r"\s+", " ", text).lower().strip()         # normalize spaces
    out = []
    for w in text.split():
        w = strip_punct(w)                                   # trim edges
        if not w or len(w) < MIN_TOKEN_LEN:
            continue
        if w and HYphen_TOKEN_RX.match(w) and w not in STOP_EN:
            out.append(w)
    return " ".join(out)                                     # join cleaned tokens
