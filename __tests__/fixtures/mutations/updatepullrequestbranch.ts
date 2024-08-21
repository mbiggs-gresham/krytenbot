import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { updatePullRequestBranchMutation as mutation } from '../../../src/github-helper-queries'

export const updatePullRequestBranchMutation = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: mutation() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
