#!/usr/bin/env python3
"""
Monitor Bridge for Arelorian Engine
Checks health endpoint every N seconds and logs errors
"""

import os
import sys
import time
import logging
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# Configuration
ENGINE_URL = os.environ.get('ENGINE_URL', 'http://localhost:3000')
CHECK_INTERVAL = int(os.environ.get('CHECK_INTERVAL', 60))
FAILURE_THRESHOLD = int(os.environ.get('FAILURE_THRESHOLD', 3))

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [MONITOR] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

consecutive_failures = 0

def check_health():
    """Check the /health endpoint"""
    global consecutive_failures
    
    try:
        req = Request(f'{ENGINE_URL}/health')
        req.add_header('User-Agent', 'Monitor-Bridge/1.0')
        
        with urlopen(req, timeout=10) as response:
            if response.status == 200:
                if consecutive_failures > 0:
                    logger.info(f'Engine recovered! ({consecutive_failures} consecutive failures)')
                    consecutive_failures = 0
                return True
            else:
                logger.warning(f'Unexpected status: {response.status}')
                consecutive_failures += 1
                return False
                
    except HTTPError as e:
        logger.error(f'HTTP Error: {e.code} - {e.reason}')
        consecutive_failures += 1
        return False
    except URLError as e:
        logger.error(f'Connection Error: {e.reason}')
        consecutive_failures += 1
        return False
    except Exception as e:
        logger.error(f'Unexpected error: {e}')
        consecutive_failures += 1
        return False

def main():
    """Main loop"""
    logger.info(f'Starting monitor - checking {ENGINE_URL}/health every {CHECK_INTERVAL}s')
    logger.info(f'Failure threshold: {FAILURE_THRESHOLD} consecutive failures')
    
    while True:
        healthy = check_health()
        
        if healthy:
            logger.debug('Engine healthy')
        else:
            if consecutive_failures >= FAILURE_THRESHOLD:
                logger.critical(f'Engine DOWN! {consecutive_failures} consecutive failures')
                # Could trigger alert here
        
        time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    main()