from playwright.sync_api import sync_playwright
import time
import sys

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-gl=angle', '--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    try:
        page.goto('http://localhost:3001/')
        print('Page loaded')

        # Wait for engine to be ready (overlay disappears)
        page.wait_for_selector('.cascade-host .overlay', state='detached', timeout=120000)
        print('Engine ready')

        # Take screenshot of initial state
        page.screenshot(path='verify-initial.png')
        print('Screenshot: verify-initial.png')

        # Find textarea and button
        textarea = page.locator('.nl-input-panel textarea').first
        button = page.locator('.nl-input-panel button').first

        textarea.fill('画一个立方体')
        print('Filled input')

        button.click()
        print('Clicked send')

        # Wait for loading to finish
        page.wait_for_selector('.message.loading', state='detached', timeout=120000)
        print('Response received')

        # Wait a bit for rendering
        time.sleep(3)

        # Take screenshot of result
        page.screenshot(path='verify-result.png')
        print('Screenshot: verify-result.png')

        # Check for error overlay
        error = page.locator('.overlay.error')
        if error.is_visible():
            print('ERROR VISIBLE:', error.inner_text())
            sys.exit(1)

        # Check that code preview appeared
        code_preview = page.locator('.code-preview')
        if code_preview.is_visible():
            print('Code preview visible')
        else:
            print('Code preview NOT visible')
            sys.exit(1)

        print('Verification PASSED')
        browser.close()

    except Exception as e:
        print('Verification FAILED:', e)
        page.screenshot(path='verify-error.png')
        browser.close()
        sys.exit(1)
