# Use a small, security-patched Python image
FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffer logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt /app/requirements.txt

# Install Python dependencies without caching wheels to keep image small
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of your backend code into the image
# (Everything in backend/ will be copied to /app/)
COPY . /app

# Expose the port your app will listen on (for documentation; Compose maps it)
EXPOSE 8000

# Default command for production containers:
#   Use gunicorn to serve Django via WSGI. Replace "core.wsgi" if your project module name differs.
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]