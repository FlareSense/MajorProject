import asyncio
from pyppeteer import launch

async def main():
    browser = await launch()
    page = await browser.newPage()
    
    # Capture console logs
    page.on('console', lambda msg: print(f"Browser Console: {msg.text}"))
    page.on('pageerror', lambda err: print(f"Browser Error: {err}"))
    
    print("Navigating to http://localhost:5173...")
    try:
        await page.goto('http://localhost:5173', {'waitUntil': 'networkidle2'})
        print("Page loaded.")
    except Exception as e:
        print(f"Failed to load: {e}")
        
    await browser.close()

asyncio.get_event_loop().run_until_complete(main())
