# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt


RUN python -m pip install --upgrade pip setuptools wheel

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --default-timeout=600 --retries 30 --prefer-binary \
    --index-url https://download.pytorch.org/whl/cpu \
    torch

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --default-timeout=600 --retries 30 --prefer-binary sentence-transformers

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --default-timeout=600 --retries 30 --prefer-binary -r /app/requirements.txt


COPY . /app

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('Alibaba-NLP/gte-large-en-v1.5', trust_remote_code=True)"


EXPOSE 8000

CMD ["gunicorn","core.wsgi:application","--bind","0.0.0.0:8000","--workers","1","--timeout","600"]



