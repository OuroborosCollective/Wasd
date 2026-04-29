import asyncio
import sqlite3
import random
from typing import List, Optional
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from pydantic import BaseModel, Field, ValidationError

class Lead(BaseModel):
    name: str = Field(..., min_length=1)
    email: Optional[str] = None
    website: Optional[str] = None
    source: str

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
]

PROXIES = [
    None,
    # Example format: {"server": "http://proxy.example.com:8080", "username": "user", "password": "pwd"}
]

def init_db():
    conn = sqlite3.connect('leads.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            website TEXT,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

async def save_lead_to_db(lead: Lead):
    conn = sqlite3.connect('leads.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO leads (name, email, website, source) VALUES (?, ?, ?, ?)",
        (lead.name, lead.email, lead.website, lead.source)
    )
    conn.commit()
    conn.close()

async def extract_leads_task(target_urls: List[str]):
    init_db()
    
    async with async_playwright() as p:
        for url in target_urls:
            proxy_config = random.choice(PROXIES)
            
            browser = await p.chromium.launch(
                headless=True,
                proxy=proxy_config if proxy_config else None
            )
            
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            await stealth_async(page)
            
            try:
                # Target platforms often require specific navigation handling
                await page.goto(url, wait_until="networkidle", timeout=60000)
                
                # Generic Extraction Logic (must be tailored to specific DOM structures)
                # We look for common patterns in lead directories
                items = await page.query_selector_all(".card, .profile, li, article")
                
                for item in items:
                    try:
                        # Extracting raw data using JS to handle hidden or complex structures
                        raw_data = await item.evaluate('''node => {
                            const nameEl = node.querySelector('h1, h2, h3, .name, [itemprop="name"]');
                            const mailEl = node.querySelector('a[href^="mailto:"], .email');
                            const linkEl = node.querySelector('a[href^="http"], .website');
                            
                            return {
                                name: nameEl ? nameEl.innerText.trim() : null,
                                email: mailEl ? mailEl.href.replace('mailto:', '').split('?')[0] : null,
                                website: linkEl ? linkEl.href : null
                            }
                        }''')
                        
                        if not raw_data['name']:
                            continue
                            
                        # Validation via Pydantic
                        lead = Lead(
                            name=raw_data['name'],
                            email=raw_data['email'],
                            website=raw_data['website'],
                            source=url
                        )
                        
                        await save_lead_to_db(lead)
                        
                    except ValidationError:
                        continue
                    except Exception:
                        continue
                        
            except Exception as e:
                # Standard error suppression for worker stability
                pass
            finally:
                await context.close()
                await browser.close()

if __name__ == "__main__":
    # Placeholder for local testing
    # asyncio.run(extract_leads_task(["https://example.com/directory"]))
    pass