import { updatePullRequestBranchMutation as mutation } from '../../../src/github-helper-queries'

export const updatePullRequestBranchMutation = (): object => ({
  body: { query: mutation() },
  matchPartialBody: true,
  overwriteRoutes: false
})
