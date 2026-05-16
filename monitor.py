#!/usr/bin/env python3
"""
Monitor Bridge for Arelorian Engine.
Checks multiple readiness endpoints and avoids false DOWN alerts while the engine initializes.
"""

import json
import logging
import os
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ENGINE_URL = os.environ.get("ENGINE_URL", "http://localhost:3001").rstrip("/")
CHECK_INTERVAL = int(os.environ.get("CHECK_INTERVAL", 60))
FAILURE_THRESHOLD = int(os.environ.get("FAILURE_THRESHOLD", 3))
STARTUP_GRACE_SECONDS = int(os.environ.get("STARTUP_GRACE_SECONDS", 360))
REQUEST_TIMEOUT_SECONDS = int(os.environ.get("REQUEST_TIMEOUT_SECONDS", 10))
READINESS_PATHS = [path.strip() for path in os.environ.get("READINESS_PATHS", "/health,/client-config.json").split(",") if path.strip()]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [MONITOR] %(levelname)s: %(message)s",
    handlers=[logging.FileHandler("/app/logs/monitor.log"), logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

consecutive_failures = 0
started_at = time.time()


def request_path(path: str):
    url = f"{ENGINE_URL}{path if path.startswith('/') else '/' + path}"
    req = Request(url)
    req.add_header("User-Agent", "Monitor-Bridge/1.1")
    with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        body = response.read(4096)
        return response.status, body


def is_startup_grace_active() -> bool:
    return (time.time() - started_at) < STARTUP_GRACE_SECONDS


def check_health() -> bool:
    global consecutive_failures
    errors = []

    for path in READINESS_PATHS:
        try:
            status, body = request_path(path)
            if path == "/health":
                if status == 200:
                    if consecutive_failures > 0:
                        logger.info("Engine recovered after %s consecutive failures", consecutive_failures)
                    consecutive_failures = 0
                    return True
                if status == 503 and is_startup_grace_active():
                    logger.info("Engine initializing via /health; grace window active")
                    consecutive_failures = 0
                    return True
                errors.append(f"{path}: status {status}")
                continue

            if status < 500:
                if consecutive_failures > 0:
                    logger.info("Engine recovered via %s after %s consecutive failures", path, consecutive_failures)
                consecutive_failures = 0
                return True
            errors.append(f"{path}: status {status}")
        except HTTPError as exc:
            if path == "/health" and exc.code == 503 and is_startup_grace_active():
                logger.info("Engine initializing via /health HTTP 503; grace window active")
                consecutive_failures = 0
                return True
            errors.append(f"{path}: HTTP {exc.code} {exc.reason}")
        except URLError as exc:
            errors.append(f"{path}: connection {exc.reason}")
        except Exception as exc:
            errors.append(f"{path}: {type(exc).__name__} {exc}")

    consecutive_failures += 1
    logger.error("Readiness failed: %s", "; ".join(errors))
    return False


def main() -> None:
    logger.info("Starting monitor - checking %s paths=%s every %ss", ENGINE_URL, json.dumps(READINESS_PATHS), CHECK_INTERVAL)
    logger.info("Failure threshold: %s consecutive failures", FAILURE_THRESHOLD)
    logger.info("Startup grace: %ss", STARTUP_GRACE_SECONDS)

    while True:
        healthy = check_health()
        if healthy:
            logger.debug("Engine healthy")
        elif consecutive_failures >= FAILURE_THRESHOLD:
            logger.critical("Engine DOWN! %s consecutive failures", consecutive_failures)
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
