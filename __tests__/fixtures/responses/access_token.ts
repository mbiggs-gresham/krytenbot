export const accessTokenResponse = (): object => ({
  token: 'secret123',
  expires_at: '1970-01-01T01:00:00.000Z',
  permissions: {
    metadata: 'write'
  },
  repository_selection: 'all'
})
