/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
import { it, describe, vi, expect, MockInstance, afterEach } from 'vitest'
import fetchMock from 'fetch-mock'
import * as core from '@actions/core'
import { installationResponse } from './fixtures/responses/installation'
import { accessTokenResponse } from './fixtures/responses/access_token'
import { contentsResponse } from './fixtures/responses/contents'
import { commitResponse } from './fixtures/responses/commit'
import { findDraftReleaseBaseResponse, findDraftReleaseResponse } from './fixtures/responses/finddraftrelease'
import { findDraftReleaseQuery } from './fixtures/queries/finddraftrelease'
import { findLatestTagQuery } from './fixtures/queries/findlatesttag'
import { releasesResponse } from './fixtures/responses/releases'
import { findLatestTagResponse } from './fixtures/responses/findlatesttag'
import { generateNotesResponse } from './fixtures/responses/generate-notes'
import { releaseResponse } from './fixtures/responses/release'
import { updatePullRequestBranchMutation } from './fixtures/mutations/updatepullrequestbranch'
import { updatePullRequestBranchResponse } from './fixtures/responses/updatepullrequestbranch'
import { baseContext } from './fixtures/contexts/base'
import { pushContext } from './fixtures/contexts/push'
import { createRefResponse } from './fixtures/responses/createref'
import { createRefMutation } from './fixtures/mutations/createref'
import { getFileContents } from './fixtures/queries/getfilecontents'
import { getFileContentsResponse } from './fixtures/responses/getfilecontents'
import { createCommitOnBranchResponse } from './fixtures/responses/createcommitonbranch'
import { createCommitOnBranchMutation } from './fixtures/mutations/createcommitonbranch'

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

const setFailedMock: MockInstance<typeof core.setFailed> = vi.spyOn(core, 'setFailed')
const getInputMock: MockInstance<typeof core.getInput> = vi.spyOn(core, 'getInput').mockImplementation(name => {
  switch (name) {
    case 'app_id':
      return APP_ID
    case 'private_key':
      return PRIVATE_KEY
    default:
      return ''
  }
})

/**
 * Mock the node-fetch module with a sandbox
 * @param sandbox
 */
export const nodeFetchMock = (sandbox: fetchMock.FetchMockSandbox) => {
  return () => ({
    default: sandbox
  })
}

describe('action', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retrieves the inputs correctly', async () => {
    const fetch = fetchMock.sandbox()
    vi.doMock('node-fetch', nodeFetchMock(fetch))
    vi.doMock('@actions/github', baseContext)

    const main = await import('../src/main')
    const runMock: MockInstance<typeof main.run> = vi.spyOn(main, 'run')

    // prettier-ignore
    fetch
      .getOnce('path:/repos/foo/bar/installation', installationResponse, { name: 'installation' })
      .postOnce('path:/app/installations/123/access_tokens', accessTokenResponse, { name: 'accesstokens' })
      .getOnce('path:/repos/foo/bar/contents/.github%2Fkrytenbot.yml', contentsResponse, { name: 'config' })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()

    expect(getInputMock).toHaveBeenCalledTimes(2)
    expect(getInputMock).toHaveBeenNthCalledWith(1, 'app_id')
    expect(getInputMock).toHaveBeenNthCalledWith(2, 'private_key')

    expect(fetch.calls()).to.have.length(3)
    expect(fetch.called('installation')).to.be.true
    expect(fetch.called('accesstokens')).to.be.true
    expect(fetch.called('config')).to.be.true
  })

  it.skip('handles push event with no branch or pr correctly', async () => {
    const fetch = fetchMock.sandbox()
    vi.doMock('node-fetch', nodeFetchMock(fetch))
    vi.doMock('@actions/github', pushContext)

    // prettier-ignore
    fetch
      .getOnce('path:/repos/foo/bar/installation', installationResponse, { name: 'installation' })
      .postOnce('path:/app/installations/123/access_tokens', accessTokenResponse, { name: 'accesstokens' })
      .getOnce('path:/repos/foo/bar/contents/.github%2Fkrytenbot.yml', contentsResponse, { name: 'config' })
      .getOnce('path:/repos/foo/bar/commits/40e93ef1c435e7eb172ec99c4695ae675d1b87c9', commitResponse, { name:'commits' })
      .postOnce('path:/graphql', findDraftReleaseBaseResponse, findDraftReleaseQuery({ name: 'finddraftrelease' }))

      .postOnce('path:/graphql', createRefResponse, createRefMutation({ name: 'createref' }))
      .postOnce('path:/graphql', getFileContentsResponse, getFileContents({ name: 'getfilecontents' }))
      .postOnce('path:/graphql', createCommitOnBranchResponse, createCommitOnBranchMutation({ name: 'createcommitonbranch' }))

      // create pull request
      // update pull request labels

      .getOnce('path:/repos/foo/bar/releases', releasesResponse, { name: 'listreleases' })
      .post('path:/graphql', findLatestTagResponse, findLatestTagQuery({ name: 'findlatesttag', repeat: 2 }))
      .postOnce('path:/repos/foo/bar/releases/generate-notes', generateNotesResponse, { name: 'generatenotes' })
      .postOnce('path:/repos/foo/bar/releases', releaseResponse, { name: 'createrelease' })
      .postOnce('path:/graphql', updatePullRequestBranchResponse, updatePullRequestBranchMutation({ name: 'updatepullrequestbranch' }))

    const main = await import('../src/main')
    const runMock: MockInstance<typeof main.run> = vi.spyOn(main, 'run')

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()

    expect(fetch.calls()).to.have.length(11)
    expect(fetch.called('installation')).to.be.true
    expect(fetch.called('accesstokens')).to.be.true
    expect(fetch.called('config')).to.be.true
    expect(fetch.called('commits')).to.be.true
    expect(fetch.called('finddraftrelease')).to.be.true
    expect(fetch.called('listreleases')).to.be.true
    expect(fetch.called('findlatesttag')).to.be.true
    expect(fetch.called('generatenotes')).to.be.true
    expect(fetch.called('createrelease')).to.be.true
    expect(fetch.called('updatepullrequestbranch')).to.be.true
  })

  it('handles push event with existing branch and pr correctly', async () => {
    const fetch = fetchMock.sandbox()
    vi.doMock('node-fetch', nodeFetchMock(fetch))
    vi.doMock('@actions/github', pushContext)

    // prettier-ignore
    fetch
      .getOnce('path:/repos/foo/bar/installation', installationResponse, { name: 'installation' })
      .postOnce('path:/app/installations/123/access_tokens', accessTokenResponse, { name: 'accesstokens' })
      .getOnce('path:/repos/foo/bar/contents/.github%2Fkrytenbot.yml', contentsResponse, { name: 'config' })
      .getOnce('path:/repos/foo/bar/commits/40e93ef1c435e7eb172ec99c4695ae675d1b87c9', commitResponse, { name:'commits' })
      .postOnce('path:/graphql', findDraftReleaseResponse, findDraftReleaseQuery({ name: 'finddraftrelease' }))
      .getOnce('path:/repos/foo/bar/releases', releasesResponse, { name: 'listreleases' })
      .post('path:/graphql', findLatestTagResponse, findLatestTagQuery({ name: 'findlatesttag', repeat: 2 }))
      .postOnce('path:/repos/foo/bar/releases/generate-notes', generateNotesResponse, { name: 'generatenotes' })
      .postOnce('path:/repos/foo/bar/releases', releaseResponse, { name: 'createrelease' })
      .postOnce('path:/graphql', updatePullRequestBranchResponse, updatePullRequestBranchMutation({ name: 'updatepullrequestbranch' }))

    const main = await import('../src/main')
    const runMock: MockInstance<typeof main.run> = vi.spyOn(main, 'run')

    await main.run()
    expect(runMock).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()

    expect(fetch.calls()).to.have.length(11)
    expect(fetch.called('installation')).to.be.true
    expect(fetch.called('accesstokens')).to.be.true
    expect(fetch.called('config')).to.be.true
    expect(fetch.called('commits')).to.be.true
    expect(fetch.called('finddraftrelease')).to.be.true
    expect(fetch.called('listreleases')).to.be.true
    expect(fetch.called('findlatesttag')).to.be.true
    expect(fetch.called('generatenotes')).to.be.true
    expect(fetch.called('createrelease')).to.be.true
    expect(fetch.called('updatepullrequestbranch')).to.be.true
  })
})
