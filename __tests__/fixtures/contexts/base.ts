export interface GithubContext {
  context: {
    repo: {
      owner: string
      repo: string
    }
  }
}

export const baseContext = (): GithubContext => ({
  context: {
    repo: {
      owner: 'foo',
      repo: 'bar'
    }
  }
})
