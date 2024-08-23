import fetchMock from 'fetch-mock'
import MockOptionsMethodPost = fetchMock.MockOptionsMethodPost
import { createRefMutation as mutation } from '../../../src/github-helper-queries'

export const createRefMutation = (options?: MockOptionsMethodPost): MockOptionsMethodPost => ({
  body: { query: mutation() },
  matchPartialBody: true,
  overwriteRoutes: false,
  ...options
})
