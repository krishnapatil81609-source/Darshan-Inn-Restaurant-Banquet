import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const cssContent = fs.readFileSync(path.join(rootDir, 'src', 'style.css'), 'utf-8');

test('viewport meta tag supports modern mobile devices and safe areas', () => {
  assert.match(
    htmlContent,
    /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*viewport-fit=cover[^"']*["']/i,
    'Viewport meta tag must include width=device-width and viewport-fit=cover'
  );
});

test('global html and body prevent horizontal overflow with clip and hidden fallback', () => {
  assert.match(
    cssContent,
    /html\s*\{[^}]*overflow-x:\s*clip;/s,
    'html must have overflow-x: clip'
  );
  assert.match(
    cssContent,
    /body\s*\{[^}]*overflow-x:\s*clip;/s,
    'body must have overflow-x: clip'
  );
  assert.match(
    cssContent,
    /body\s*\{[^}]*max-width:\s*100%;/s,
    'body must be constrained to max-width: 100%'
  );
});

test('body includes bottom padding accounting for the mobile bottom bar and safe area', () => {
  assert.match(
    cssContent,
    /body\s*\{[^}]*padding-bottom:\s*calc\([^}]*env\(safe-area-inset-bottom/s,
    'body must reserve bottom padding for mobile bottom bar including env(safe-area-inset-bottom)'
  );
});

test('media elements are constrained to 100% max-width', () => {
  assert.match(
    cssContent,
    /img,\s*svg,\s*iframe,\s*video\s*\{[^}]*max-width:\s*100%;/s,
    'img, svg, iframe, video must have max-width: 100%'
  );
});

test('typography elements have overflow-wrap protection against long strings', () => {
  assert.match(
    cssContent,
    /overflow-wrap:\s*break-word;/s,
    'Typography elements must have overflow-wrap: break-word'
  );
});

test('mobile bottom bar is strictly pinned, full-width, and distributed into 3 equal flex columns', () => {
  // Check container
  assert.match(
    cssContent,
    /\.mobile-sticky-bottom-bar\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*0;[^}]*left:\s*0;[^}]*right:\s*0;[^}]*width:\s*100%;/s,
    '.mobile-sticky-bottom-bar must be fixed at bottom, spanning 0 to 0 with 100% width'
  );
  assert.match(
    cssContent,
    /\.mobile-sticky-bottom-bar\s*\{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom/s,
    '.mobile-sticky-bottom-bar must respect safe-area-inset-bottom'
  );

  // Check 3 action buttons
  assert.match(
    cssContent,
    /\.mobile-bar-btn\s*\{[^}]*flex:\s*1\s+1\s+0;[^}]*min-width:\s*0;/s,
    '.mobile-bar-btn must use flex: 1 1 0 and min-width: 0 for equal distribution without overflow'
  );

  // Check index.html has exactly 3 action items
  const bottomBarMatch = htmlContent.match(/<nav\s+class=["'][^"']*mobile-sticky-bottom-bar[^"']*["'][^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(bottomBarMatch, '.mobile-sticky-bottom-bar element must exist');
  const actionBtns = [...bottomBarMatch[1].matchAll(/class=["'][^"']*mobile-bar-btn[^"']*["']/g)];
  assert.equal(actionBtns.length, 3, 'Bottom bar must have exactly 3 action buttons (Call, Directions, WhatsApp)');
});

test('mobile navigation drawer is hidden off-screen cleanly without forcing horizontal scrollbars', () => {
  // Verify transform: translateX(105%) and visibility: hidden is used instead of right: -100%
  assert.match(
    cssContent,
    /\.mobile-nav-drawer\s*\{[^}]*transform:\s*translateX\(105%\);[^}]*visibility:\s*hidden;[^}]*pointer-events:\s*none;/s,
    '.mobile-nav-drawer must use transform: translateX(105%), visibility: hidden, and pointer-events: none when closed'
  );

  // Verify opening state
  assert.match(
    cssContent,
    /\.mobile-nav-drawer\.open\s*\{[^}]*transform:\s*translateX\(0\);[^}]*visibility:\s*visible;[^}]*pointer-events:\s*auto;/s,
    '.mobile-nav-drawer.open must slide to translateX(0) and become visible'
  );

  // Verify width is bounded
  assert.match(
    cssContent,
    /\.mobile-nav-drawer\s*\{[^}]*width:\s*min\(86vw,\s*340px\);/s,
    '.mobile-nav-drawer must be bounded by min(86vw, 340px)'
  );
});

test('backdrops do not use 100vw which causes scrollbar overflow', () => {
  // .mobile-drawer-backdrop should use inset/100% rather than 100vw
  const drawerBackdropMatch = cssContent.match(/\.mobile-drawer-backdrop\s*\{([^}]*)\}/s);
  assert.ok(drawerBackdropMatch, '.mobile-drawer-backdrop must be defined');
  assert.doesNotMatch(
    drawerBackdropMatch[1],
    /width:\s*100vw/,
    '.mobile-drawer-backdrop must not use 100vw'
  );

  // .custom-modal-backdrop should not use 100vw
  const modalBackdropMatch = cssContent.match(/\.custom-modal-backdrop\s*\{([^}]*)\}/s);
  assert.ok(modalBackdropMatch, '.custom-modal-backdrop must be defined');
  assert.doesNotMatch(
    modalBackdropMatch[1],
    /width:\s*100vw/,
    '.custom-modal-backdrop must not use 100vw'
  );
});

test('compact mobile query (< 480px) addresses tight viewports like 320px and 360px', () => {
  assert.match(
    cssContent,
    /@media\s*\(\s*max-width:\s*480px\s*\)/,
    'CSS should have dedicated rules for narrow mobile viewports (< 480px)'
  );
  assert.match(
    cssContent,
    /\.hero-title\s*\{[^}]*clamp\(/s,
    '.hero-title should use fluid clamp() typography'
  );
  assert.match(
    cssContent,
    /\.pricing-headline\s*\{[^}]*clamp\(/s,
    '.pricing-headline should use fluid clamp() typography'
  );
});
