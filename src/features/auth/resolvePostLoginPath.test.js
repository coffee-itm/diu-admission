import { describe, it, expect } from 'vitest';
import { resolvePostLoginPath } from './resolvePostLoginPath.js';

describe('resolvePostLoginPath', () => {
  it('returns admin deep link for admin', () => {
    expect(resolvePostLoginPath('/admin/merit-list', 'admin')).toBe('/admin/merit-list');
  });
  it('returns candidate deep link for candidate', () => {
    expect(resolvePostLoginPath('/candidate/result', 'candidate')).toBe('/candidate/result');
  });
  it('sends candidate asking for admin page to candidate dashboard', () => {
    expect(resolvePostLoginPath('/admin/questions', 'candidate')).toBe('/candidate/dashboard');
  });
  it('sends admin asking for candidate page to admin dashboard', () => {
    expect(resolvePostLoginPath('/candidate/test', 'admin')).toBe('/admin/dashboard');
  });
  it('falls back to dashboard for / or missing from', () => {
    expect(resolvePostLoginPath('/', 'candidate')).toBe('/candidate/dashboard');
    expect(resolvePostLoginPath(undefined, 'admin')).toBe('/admin/dashboard');
  });
  it('rejects lookalike prefixes', () => {
    expect(resolvePostLoginPath('/administrator', 'admin')).toBe('/admin/dashboard');
  });
});
