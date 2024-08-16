import { findLatestTagQuery as query } from '../../../src/github-helper-queries'

export const findLatestTagQuery = (): object => ({
  body: { query: query() },
  matchPartialBody: true,
  overwriteRoutes: false
})
