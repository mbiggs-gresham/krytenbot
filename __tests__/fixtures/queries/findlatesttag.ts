import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { findLatestTagQuery as query } from '../../../src/github-helper-queries'

export const findLatestTagQuery = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: query() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
