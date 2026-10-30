import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  // globals are off, so Testing Library can't register its own auto-cleanup
  cleanup()
  localStorage.clear()
})
