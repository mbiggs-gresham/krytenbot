/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
import { it, describe, beforeEach, expect, vi, MockInstance } from 'vitest'
import * as core from '@actions/core'
import * as main from '../src/main'

describe('action', () => {
  // Mock the action's main function
  const runMock = vi.spyOn(main, 'run')

  // Mock the GitHub Actions core library
  // let debugMock: MockInstance<typeof core.debug>
  let errorMock: MockInstance<typeof core.error>
  let getInputMock: MockInstance<typeof core.getInput>
  // let setFailedMock: MockInstance<typeof core.setFailed>
  // let setOutputMock: MockInstance<typeof core.setOutput>

  vi.mock('@actions/github', () => ({
    context: {
      payload: {
        pull_request: {
          number: 1
        }
      },
      repo: {
        owner: 'mbiggs-gresham',
        repo: 'krytenbot'
      }
    },
    getOctokit: vi.fn()
  }))

  beforeEach(() => {
    // vi.clearAllMocks()
    // debugMock = vi.spyOn(core, 'debug').mockImplementation(() => {})
    errorMock = vi.spyOn(core, 'error').mockImplementation(() => {})
    getInputMock = vi.spyOn(core, 'getInput').mockImplementation((): string => 'blah')
    // setFailedMock = vi.spyOn(core, 'setFailed').mockImplementation(() => {})
    // setOutputMock = vi.spyOn(core, 'setOutput').mockImplementation(() => {})
  })

  it('retrieves the inputs correctly', async () => {
    const runMock = vi.spyOn(main, 'run')

    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'app_id':
          return 'APP_ID'
        case 'private_key':
          return 'PRIVATE_KEY'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(getInputMock).toHaveBeenCalledTimes(2)
    expect(getInputMock).toHaveBeenNthCalledWith(1, 'app_id')
    expect(getInputMock).toHaveBeenNthCalledWith(2, 'private_key')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('handles push event correctly', async () => {
    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(getInputMock).toHaveBeenNthCalledWith(1, 'app_id')
    expect(getInputMock).toHaveBeenNthCalledWith(2, 'private_key')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
