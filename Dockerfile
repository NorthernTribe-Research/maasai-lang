# syntax=docker/dockerfile:1.7

FROM python:3.14-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash appuser

FROM base AS deps

COPY space/requirements.txt /tmp/requirements-space.txt
RUN python -m pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 \
    && pip install -r /tmp/requirements-space.txt

FROM base AS runtime

COPY --from=deps /usr/local /usr/local
COPY space ./space
COPY data/glossary ./data/glossary
COPY src ./src
COPY README.md ./README.md
COPY LICENSE ./LICENSE

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 7860

ENV GRADIO_SERVER_NAME=0.0.0.0 \
    PORT=7860 \
    GRADIO_ANALYTICS_ENABLED=False \
    HF_HUB_DISABLE_TELEMETRY=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/', timeout=4).read(1)" || exit 1

CMD ["python", "space/app.py"]
