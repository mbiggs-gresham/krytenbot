import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { findDraftReleaseQuery as query } from '../../../src/github-helper-queries'

export const findDraftReleaseQuery = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: query() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
