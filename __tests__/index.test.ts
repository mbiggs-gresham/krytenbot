/**
 * Unit tests for the action's entrypoint, src/index.ts
 */
import { it, describe, expect, vi } from 'vitest'
import * as main from '../src/main'

describe('index', () => {
  it('calls run when imported', async () => {
    const runMock = vi.spyOn(main, 'run')
    runMock.mockImplementation(async (): Promise<void> => {})

    await import('../src/index')
    expect(runMock).toHaveBeenCalled()
  })
})
