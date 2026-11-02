import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

test('index.html contains critical meta tags and responsive viewport', () => {
  assert.match(htmlContent, /<meta\s+name=["']viewport["']/i);
  assert.match(htmlContent, /<meta\s+charset=["']UTF-8["']/i);
  assert.match(htmlContent, /<title>.*Darshan Inn.*<\/title>/i);
  assert.match(htmlContent, /<meta\s+name=["']description["']/i);
  assert.match(htmlContent, /<link\s+rel=["']canonical["']/i);
  assert.match(htmlContent, /<link\s+rel=["']icon["']/i);
});

test('index.html contains all main page section IDs', () => {
  const expectedSections = ['hero', 'about', 'services', 'pricing', 'menu', 'gallery', 'hours', 'contact'];
  for (const id of expectedSections) {
    assert.match(htmlContent, new RegExp(`id=["']${id}["']`), `Expected section #${id} to exist`);
  }
});

test('all hash navigation links point to existing IDs in the document', () => {
  const hashMatches = [...htmlContent.matchAll(/href=["']#([a-zA-Z0-9_-]+)["']/g)];
  assert.ok(hashMatches.length > 0, 'Expected to find internal anchor links');

  for (const match of hashMatches) {
    const targetId = match[1];
    if (targetId === '') continue;
    const hasTarget = new RegExp(`id=["']${targetId}["']`).test(htmlContent);
    assert.ok(hasTarget, `Anchor href="#${targetId}" does not have matching element id`);
  }
});

test('all local images referenced in index.html exist in public directory', () => {
  const imgMatches = [...htmlContent.matchAll(/src=["']\/([^"']+)["']/g)];
  assert.ok(imgMatches.length > 0, 'Expected image sources in HTML');

  for (const match of imgMatches) {
    const relPath = match[1];
    const fullPath = path.join(rootDir, 'public', relPath);
    assert.ok(fs.existsSync(fullPath), `Referenced image does not exist on disk: ${relPath}`);
  }
});

test('index.html has valid Schema.org Restaurant JSON-LD', () => {
  const jsonLdMatch = htmlContent.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  assert.ok(jsonLdMatch, 'JSON-LD script tag missing');

  const json = JSON.parse(jsonLdMatch[1]);
  assert.equal(json['@context'], 'https://schema.org');
  assert.equal(json['@type'], 'Restaurant');
  assert.equal(json.name, 'Darshan Inn Restaurant');
  assert.ok(json.telephone, 'Telephone missing');
  assert.ok(json.address, 'Address missing');
  assert.equal(json.address.addressLocality, 'Surat');
  assert.equal(json.address.postalCode, '394210');
});

test('interactive modal and mobile drawer have proper ARIA attributes', () => {
  assert.match(htmlContent, /id=["']hours-modal["']/);
  assert.match(htmlContent, /role=["']dialog["']/);
  assert.match(htmlContent, /aria-modal=["']true["']/);
  assert.match(htmlContent, /id=["']mobile-menu-toggle["'][^>]*aria-expanded=["']false["']/);
  assert.match(htmlContent, /id=["']mobile-nav-drawer["'][^>]*aria-hidden=["']true["']/);
  assert.match(htmlContent, /id=["']mobile-drawer-backdrop["']/);
});

test('contact information contains phone, directions, and pure veg declaration', () => {
  assert.match(htmlContent, /href=["']tel:\+918153010366["']/);
  assert.match(htmlContent, /5V2F%2B48%20Surat/);
  assert.match(htmlContent, /Pure Vegetarian/i);
});
