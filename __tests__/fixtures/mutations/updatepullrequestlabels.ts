import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { updatePullRequestLabelsMutation as mutation } from '../../../src/github-helper-queries'

export const updatePullRequestLabelsMutation = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: mutation() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
