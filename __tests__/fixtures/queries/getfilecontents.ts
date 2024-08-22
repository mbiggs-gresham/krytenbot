import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { getFileContentQuery as query } from '../../../src/github-helper-queries'

export const getFileContents = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: query() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
