import { KrytenbotDraftRelease } from '../../../src/github-helper'

interface KrytenbotDraftReleaseResponse {
  data: {
    repository: KrytenbotDraftRelease
  }
}

/**
 * Base response for a draft release with no branches or pull requests
 */
export const findDraftReleaseBaseResponse = (): KrytenbotDraftReleaseResponse => ({
  data: {
    repository: {
      id: 'R_kfDOMgGsmA',
      url: 'https://github.com/foo/bar',
      tags: {
        tags: []
      },
      branches: {
        branches: []
      },
      releaseLabel: {
        id: 'LA_kwDOMgQsmc8AAAABsu_aSt',
        name: 'release'
      },
      projectLabel: {
        id: 'LA_kwDOMgPsmc8AAAABtEYMwf',
        name: 'test'
      },
      pullRequests: {
        pullRequests: []
      }
    }
  }
})

/**
 * Response for a draft release with an existing branch and pull request
 */
export const findDraftReleaseResponse = (): KrytenbotDraftReleaseResponse => {
  const base = findDraftReleaseBaseResponse()
  return {
    data: {
      repository: {
        ...base.data.repository,
        branches: {
          branches: [
            {
              id: 'REF_kwDOMgBsmblyZWZzL2hlYWRzL2tyeXRlbmJvdC1ncmlk',
              name: 'krytenbot-test'
            }
          ]
        },
        pullRequests: {
          pullRequests: [
            {
              id: 'PR_kwKOMgXsmc54G5lC',
              number: 1,
              title: 'Release `test` v0.0.1',
              body: '[//]: # (krytenbot-project:test)\n[//]: # (krytenbot-version:0.0.1)\n\n\nThis PR was created automatically by the Krytenbot to track the next release. \nThe next version for this release is v0.0.1.\n\nYou can find the release notes for this version [here](https://github.com/foo/bar/releases).\n\n---\n\n<details>\n<summary>Krytenbot commands and options</summary>\n<br />\n\nYou can trigger Krytenbot actions by commenting on this PR:\n- `@krytenbot rebase` will rebase this PR\n- `@krytenbot recreate` will recreate this PR, overwriting any edits that have been made to it\n- `@krytenbot setversion [major|minor|patch]` will set the version for this PR\n</details>\n  ',
              createdAt: '2024-08-12T13:24:08Z',
              lastEditedAt: '2024-08-12T13:24:08Z',
              baseRefName: 'main',
              baseRefOid: '40e93ef1c435e7eb172ec99c4695ae675d1b87c9',
              headRefName: 'krytenbot-test',
              headRefOid: '522ba908c498878c73c5aea594d8da766898bca9',
              author: {
                login: 'krytenbot'
              },
              comments: {
                comments: []
              }
            }
          ]
        }
      }
    }
  }
}
