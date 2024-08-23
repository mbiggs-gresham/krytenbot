import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { createCommitOnBranchMutation as mutation } from '../../../src/github-helper-queries'

export const createCommitOnBranchMutation = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: mutation() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
