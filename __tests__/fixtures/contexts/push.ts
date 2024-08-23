import { baseContext } from './base'

export const pushContext = (): object => {
  const base = baseContext()
  return {
    context: {
      ...base.context,
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {
        after: '40e93ef1c435e7eb172ec99c4695ae675d1b87c9',
        commits: [
          {
            author: {
              email: 'test@test.com',
              name: 'test',
              username: 'test'
            },
            committer: {
              email: 'test@test.com',
              name: 'test',
              username: 'test'
            },
            id: '40e93ef1c435e7eb172ec99c4695ae675d1b87c9',
            message: 'test commit',
            timestamp: '2024-08-12T13:56:13+01:00'
          }
        ]
      }
    }
  }
}

export const pushReleaseContext = (): object => {
  const base = baseContext()
  return {
    context: {
      ...base.context,
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {
        after: '40e93ef1c435e7eb172ec99c4695ae675d1b87c9',
        commits: [
          {
            author: {
              email: 'krytenbot[bot]@github.com',
              name: 'krytenbot[bot]',
              username: 'krytenbot[bot]'
            },
            committer: {
              email: 'krytenbot[bot]@github.com',
              name: 'krytenbot[bot]',
              username: 'krytenbot[bot]'
            },
            id: '40e93ef1c435e7eb172ec99c4695ae675d1b87c9',
            message: 'test commit',
            timestamp: '2024-08-12T13:56:13+01:00'
          }
        ]
      }
    }
  }
}
