import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { createPullRequestMutation as mutation } from '../../../src/github-helper-queries'

export const createPullRequestMutation = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: mutation() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
