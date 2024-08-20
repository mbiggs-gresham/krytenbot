/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
import { it, describe, vi, expect, MockInstance, beforeEach } from 'vitest'
import path from 'path'
import mock from 'fetch-mock'
import * as core from '@actions/core'
import { installationResponse } from './fixtures/responses/installation'
import { accessTokenResponse } from './fixtures/responses/access_token'
import { contentsResponse } from './fixtures/responses/contents'
import { commitResponse } from './fixtures/responses/commit'
import { findDraftReleaseResponse } from './fixtures/responses/finddraftrelease'
import { findDraftReleaseQuery } from './fixtures/queries/finddraftrelease'
import { findLatestTagQuery } from './fixtures/queries/findlatesttag'
import { releasesResponse } from './fixtures/responses/releases'
import { findLatestTagResponse } from './fixtures/responses/findlatesttag'
import { generateNotesResponse } from './fixtures/responses/generate-notes'
import { releaseResponse } from './fixtures/responses/release'
import { updatePullRequestBranchMutation } from './fixtures/mutations/updatepullrequestbranch'
import { updatePullRequestBranchResponse } from './fixtures/responses/updatepullrequestbranch'

const APP_ID = '123'
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu3aozN3tihPmljnnudb9G3HECdnH
lWu2/a1gB9JW5TBQ+AVpum9Okx7KfqkfBKL9mcHgSL0yWMdjMfNOqNtrQqKlN4kE
p6RD++7sGbzbfZ9arwrlD/HSDAWGdGGJTSOBM6pHehyLmSC3DJoR/CTu0vTGTWXQ
rO64Z8tyXQPtVPb/YXrcUhbBp8i72b9Xky0fD6PkEebOy0Ip58XVAn2UPNlNOSPS
ye+Qjtius0Md4Nie4+X8kwVI2Qjk3dSm0sw/720KJkdVDmrayeljtKBx6AtNQsSX
gzQbeMmiqFFkwrG1+zx6E7H7jqIQ9B6bvWKXGwIDAQABAoIBAD8kBBPL6PPhAqUB
K1r1/gycfDkUCQRP4DbZHt+458JlFHm8QL6VstKzkrp8mYDRhffY0WJnYJL98tr4
4tohsDbqFGwmw2mIaHjl24LuWXyyP4xpAGDpl9IcusjXBxLQLp2m4AKXbWpzb0OL
Ulrfc1ZooPck2uz7xlMIZOtLlOPjLz2DuejVe24JcwwHzrQWKOfA11R/9e50DVse
hnSH/w46Q763y4I0E3BIoUMsolEKzh2ydAAyzkgabGQBUuamZotNfvJoDXeCi1LD
8yNCWyTlYpJZJDDXooBU5EAsCvhN1sSRoaXWrlMSDB7r/E+aQyKua4KONqvmoJuC
21vSKeECgYEA7yW6wBkVoNhgXnk8XSZv3W+Q0xtdVpidJeNGBWnczlZrummt4xw3
xs6zV+rGUDy59yDkKwBKjMMa42Mni7T9Fx8+EKUuhVK3PVQyajoyQqFwT1GORJNz
c/eYQ6VYOCSC8OyZmsBM2p+0D4FF2/abwSPMmy0NgyFLCUFVc3OECpkCgYEA5OAm
I3wt5s+clg18qS7BKR2DuOFWrzNVcHYXhjx8vOSWV033Oy3yvdUBAhu9A1LUqpwy
Ma+unIgxmvmUMQEdyHQMcgBsVs10dR/g2xGjMLcwj6kn+xr3JVIZnbRT50YuPhf+
ns1ScdhP6upo9I0/sRsIuN96Gb65JJx94gQ4k9MCgYBO5V6gA2aMQvZAFLUicgzT
u/vGea+oYv7tQfaW0J8E/6PYwwaX93Y7Q3QNXCoCzJX5fsNnoFf36mIThGHGiHY6
y5bZPPWFDI3hUMa1Hu/35XS85kYOP6sGJjf4kTLyirEcNKJUWH7CXY+00cwvTkOC
S4Iz64Aas8AilIhRZ1m3eQKBgQCUW1s9azQRxgeZGFrzC3R340LL530aCeta/6FW
CQVOJ9nv84DLYohTVqvVowdNDTb+9Epw/JDxtDJ7Y0YU0cVtdxPOHcocJgdUGHrX
ZcJjRIt8w8g/s4X6MhKasBYm9s3owALzCuJjGzUKcDHiO2DKu1xXAb0SzRcTzUCn
7daCswKBgQDOYPZ2JGmhibqKjjLFm0qzpcQ6RPvPK1/7g0NInmjPMebP0K6eSPx0
9/49J6WTD++EajN7FhktUSYxukdWaCocAQJTDNYP0K88G4rtC2IYy5JFn9SWz5oh
x//0u+zd/R/QRUzLOw4N72/Hu+UG6MNt5iDZFCtapRaKt6OvSBwy8w==
-----END RSA PRIVATE KEY-----`

describe('action', () => {
  beforeEach(() => {
    process.env['INPUT_APP_ID'] = APP_ID
    process.env['INPUT_PRIVATE_KEY'] = PRIVATE_KEY
    process.env['GITHUB_REPOSITORY'] = 'foo/bar'
  })

  it.skip('retrieves the inputs correctly', async () => {
    const main = await import('../src/main')
    const runMock: MockInstance<typeof main.run> = vi.spyOn(main, 'run')
    const getInputMock: MockInstance<typeof core.getInput> = vi.spyOn(core, 'getInput')

    mock // prettier-ignore
      .getOnce('path:/repos/foo/bar/installation', installationResponse)
      .postOnce('path:/app/installations/123/access_tokens', accessTokenResponse)
      .getOnce('path:/repos/foo/bar/contents/.github%2Fkrytenbot.yml', contentsResponse)

    await main.run()
    expect(runMock).toHaveReturned()

    expect(getInputMock).toHaveBeenCalledTimes(2)
    expect(getInputMock).toHaveBeenNthCalledWith(1, 'app_id')
    expect(getInputMock).toHaveBeenNthCalledWith(2, 'private_key')
  })

  it('handles push event correctly', async () => {
    process.env['GITHUB_EVENT_NAME'] = 'push'
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'fixtures/push.json')

    mock // prettier-ignore
      .getOnce('path:/repos/foo/bar/installation', installationResponse)
      .postOnce('path:/app/installations/123/access_tokens', accessTokenResponse)
      .getOnce('path:/repos/foo/bar/contents/.github%2Fkrytenbot.yml', contentsResponse)
      .getOnce('path:/repos/foo/bar/commits', commitResponse)
      .post('path:/graphql', findDraftReleaseResponse, findDraftReleaseQuery())
      .getOnce('path:/repos/foo/bar/releases', releasesResponse)
      .post('path:/graphql', findLatestTagResponse, findLatestTagQuery())
      .postOnce('path:/repos/foo/bar/releases/generate-notes', generateNotesResponse)
      .post('path:/repos/foo/bar/releases', releaseResponse)
      .post('path:/graphql', updatePullRequestBranchResponse, updatePullRequestBranchMutation())
      // eslint-disable-next-line github/no-then
      .catch({
        error: 'not found'
      })

    const main = await import('../src/main')
    const runMock: MockInstance<typeof main.run> = vi.spyOn(main, 'run')
    const setFailedMock: MockInstance<typeof core.setFailed> = vi.spyOn(core, 'setFailed')
    const getFetchMock: MockInstance<typeof main.getFetch> = vi.spyOn(main, 'getFetch')
    getFetchMock.mockImplementation(() => mock)

    await main.run()
    // console.log(`calls: ${JSON.stringify(mock.calls(), null, 2)}`)
    expect(runMock).toHaveReturned()

    expect(setFailedMock).not.toHaveBeenCalled()
  })
})
