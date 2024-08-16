import { findDraftReleaseQuery as query } from '../../../src/github-helper-queries'

export const findDraftReleaseQuery = (): object => ({
  body: { query: query() },
  matchPartialBody: true
})
