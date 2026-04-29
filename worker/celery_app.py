import os
from celery import Celery
from playwright.sync_api import Error as PlaywrightError, TimeoutError as PlaywrightTimeoutError

# Environment variables for configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Celery Configuration
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_track_started=True
)

@app.task(
    bind=True,
    autoretry_for=(PlaywrightTimeoutError, PlaywrightError, ConnectionError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=7
)
def playwright_task_with_retry(self, *args, **kwargs):
    """
    Generic task wrapper for Playwright operations with exponential backoff.
    Retries on:
    - Playwright TimeoutError (Timeouts)
    - Playwright Error (Proxy failures, navigation errors)
    - ConnectionError (General network issues)
    """
    # Task logic implementation should be injected or called here
    pass

if __name__ == "__main__":
    app.start()