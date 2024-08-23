import { baseContext } from './base'

export const pullRequestContext = (): object => {
  const base = baseContext()
  return {
    context: {
      ...base.context,
      eventName: 'pull_request',
      ref: 'refs/heads/main',
      payload: {
        action: 'closed',
        number: 30,
        pull_request: {
          body: '[//]: # (krytenbot-project:test)\n[//]: # (krytenbot-version:0.0.1)\n\n\nThis PR was created automatically by the Krytenbot to track the next release. \nThe next version for this release is v0.0.1.\n\nYou can find the release notes for this version [here](https://github.com/foo/bar/releases).\n\n---\n\n<details>\n<summary>Krytenbot commands and options</summary>\n<br />\n\nYou can trigger Krytenbot actions by commenting on this PR:\n- `@krytenbot rebase` will rebase this PR\n- `@krytenbot recreate` will recreate this PR, overwriting any edits that have been made to it\n- `@krytenbot setversion [major|minor|patch]` will set the version for this PR\n</details>\n  ',
          labels: [
            {
              id: 7297030731,
              name: 'release'
            },
            {
              id: 7319456962,
              name: 'test'
            }
          ],
          user: {
            login: 'krytenbot[bot]'
          }
        }
      }
    }
  }
}
