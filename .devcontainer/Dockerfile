# Build-time system tools live here so postCreateCommand stays to npm and
# Playwright. Rebuilding this layer is cheap unless these packages change.
FROM mcr.microsoft.com/devcontainers/typescript-node:22

RUN apt-get update \
  && apt-get install -y --no-install-recommends gdal-bin poppler-utils \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
