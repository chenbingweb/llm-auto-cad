from playwright.sync_api import sync_playwright
import time
import sys

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-gl=angle', '--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    console_logs = []
    page.on('console', lambda msg: console_logs.append(f'{msg.type}: {msg.text}'))
    page.on('pageerror', lambda err: console_logs.append(f'PAGE ERROR: {err}'))
    page.on('response', lambda resp: console_logs.append(f'RESPONSE {resp.status}: {resp.url}') if resp.status >= 400 else None)

    try:
        page.goto('http://localhost:3001/')
        print('Page loaded')
        time.sleep(3)

        # Get Vite error overlay content
        overlay_text = page.evaluate('''() => {
            const overlay = document.querySelector('vite-error-overlay');
            return overlay ? overlay.shadowRoot ? overlay.shadowRoot.innerText : overlay.innerText : 'no overlay';
        }''')
        print('Overlay text:', overlay_text)

        # Print console logs
        print('Console logs:')
        for log in console_logs:
            print('  ', log)

        page.screenshot(path='/Users/chenbing/study/AI-Test/onLineCAD/frontend/verify-error.png', full_page=True)
        browser.close()

    except Exception as e:
        print('Verification FAILED:', e)
        browser.close()
        sys.exit(1)
