import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from 'octokit'
import { PushEvent } from '@octokit/webhooks-types'
import { minimatch } from 'minimatch'
import * as semver from 'semver'
import * as versions from './version-helper'
import * as base64 from './base64-helper'
import { hidden, important } from './markdown'
import { GraphQlQueryResponseData } from '@octokit/graphql'
import { Endpoints } from '@octokit/types'
import { ConfigProject } from './config-helper'

type CreateReleaseResponse = Endpoints['POST /repos/{owner}/{repo}/releases']['response']
type UpdateReleaseResponse = Endpoints['PATCH /repos/{owner}/{repo}/releases/{release_id}']['response']
type GenerateReleaseNotesResponse = Endpoints['POST /repos/{owner}/{repo}/releases/generate-notes']['response']
type ListReleasesResponse = Endpoints['GET /repos/{owner}/{repo}/releases']['response']
type GitDraftHubRelease = ListReleasesResponse['data'][0]

export interface Branch {
  id: string
  name: string
}

export interface Branches {
  branches: Branch[]
}

export interface Tag {
  id: string
  name: string
}

export interface Tags {
  tags: Tag[]
}

export interface Label {
  id: string
  name: string
}

export interface Comment {
  id: string
  author: {
    login: string
  }
  body: string
}

export interface Comments {
  comments: Comment[]
}

export interface PullRequest {
  id: string
  number: number
  title: string
  body: string
  createdAt: string
  lastEditedAt: string
  baseRefName: string
  baseRefOid: string
  headRefName: string
  headRefOid: string
  comments: Comments
  author: {
    login: string
  }
}

export interface PullRequests {
  pullRequests: PullRequest[]
}

export interface KrytenbotDraftRelease {
  id: string
  url: string
  tags: Tags
  branches: Branches
  releaseLabel: Label
  projectLabel: Label
  pullRequests: PullRequests
}

export type Version = 'major' | 'minor' | 'patch'
export type Reaction = 'THUMBS_UP' | 'THUMBS_DOWN' | 'LAUGH' | 'HOORAY' | 'CONFUSED' | 'HEART' | 'ROCKET' | 'EYES'

export enum Commands {
  Rebase = '@krytenbot rebase',
  Recreate = '@krytenbot recreate',
  SetVersion = '@krytenbot setversion'
}

const createRefMutation = (): string => {
  return `
    mutation CreateRef($repositoryId: ID!, $name: String!, $oid: GitObjectID!) {
        createRef(input:{ clientMutationId: "krytenbot", repositoryId: $repositoryId, name: $name, oid: $oid }) {
            ref {
                name
                target {
                    oid
                }
            }
        }
    }`
}

const updateRefMutation = (): string => {
  return `
    mutation UpdateRef($refId: ID!, $oid: GitObjectID!) {
        updateRef(input:{ clientMutationId: "krytenbot", refId: $refId, oid: $oid, force: true }) {
            ref {
                name
                target {
                    oid
                }
            }
        }
    }`
}

const createCommitOnBranchMutation = (): string => {
  return `
    mutation CreateCommitOnBranch($branch: CommittableBranch!, $message: CommitMessage!, $expectedHeadOid: GitObjectID!, $fileChanges: FileChanges) {
        createCommitOnBranch(input:{ clientMutationId: "krytenbot", branch: $branch, message: $message, expectedHeadOid: $expectedHeadOid, fileChanges: $fileChanges }) {
            commit {
                oid
            }
        }
    }`
}

const createPullRequestMutation = (): string => {
  return `
    mutation CreatePullRequest($repositoryId: ID!, $baseRefName: String!, $headRefName: String!, $title: String!, $body: String!) {
        createPullRequest(input:{ clientMutationId: "krytenbot", repositoryId: $repositoryId, baseRefName: $baseRefName, headRefName: $headRefName, title: $title, body: $body, draft: true }) {
            pullRequest {
                id
            }
        }
    }`
}

const updatePullRequestLabelsMutation = (): string => {
  return `
    mutation UpdatePullRequestLabels($pullRequestId: ID!, $labelIds: [ID!]) {
        updatePullRequest(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId, labelIds: $labelIds }) {
            pullRequest {
                id
            }
        }
    }`
}

const updatePullRequestTitleAndBodyMutation = (): string => {
  return `
    mutation UpdatePullRequestLabels($pullRequestId: ID!, $title: String, $body: String) {
        updatePullRequest(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId, title: $title, body: $body }) {
            pullRequest {
                id
            }
        }
    }`
}

const updatePullRequestBranchMutation = (): string => {
  return `
    mutation UpdatePullRequestBranch($pullRequestId: ID!) {
        updatePullRequestBranch(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId, updateMethod: REBASE }) {
            pullRequest {
                id
            }
        }
    }`
}

const reopenPullRequestMutation = (): string => {
  return `
    mutation ReopenPullRequest($pullRequestId: ID!) {
        reopenPullRequest(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId }) {
            pullRequest {
                id
            }
        }
    }`
}

const addReactionMutation = (): string => {
  return `
    mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
        addReaction(input:{ clientMutationId: "krytenbot", subjectId: $subjectId, content: $content }) {
            reaction {
                content
            }
            subject {
                id
            }
        }
    }`
}

const addCommentMutation = (): string => {
  return `
    mutation AddPullRequestComment($subjectId: ID!, $body: String!) {
        addComment(input:{ clientMutationId: "krytenbot", subjectId: $subjectId, body: $body }) {            
            subject {
                id
            }
        }
    }`
}

// const findRefQuery = (): string => {
//   return `
//     query FindRef($owner: String!, $repo: String!, $ref: String!) {
//         repository(owner: $owner, name: $repo) {
//             ref(qualifiedName: $ref) {
//                 name
//             }
//         }
//     }`
// }

const getFileContentQuery = (): string => {
  return `
    query GetFileContent($owner: String!, $repo: String!, $ref: String!) {
        repository(owner: $owner, name: $repo) {
              file: object(expression: $ref) {
                  ... on Blob {
                      content: text
                  }
              }
        }
    }`
}

// const findCommitQuery = (): string => {
//   return `
//     query FindCommit($owner: String!, $repo: String!, $oid: GitObjectID!) {
//         repository(owner: $owner, name: $repo) {
//             object(oid: $oid) {
//                 ... on Commit {
//                     oid
//                     message
//                     changedFilesIfAvailable
//                     tree {
//                        entries {
//                           name
//                           path
//                        }
//                     }
//                     history(first: 1) {
//                         nodes {
//                             id
//                             oid
//                             message
//                             changedFiles
//                             tree {
//                               entries {
//                                 name
//                                 path
//                               }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     }`
// }

const findLatestTagQuery = (): string => {
  return `
    query FindLatestTag($owner: String!, $repo: String!, $project: String!) {
        repository(owner: $owner, name: $repo) {
            tags: refs(last: 1, refPrefix: "refs/tags/", query: $project) {
                tags: nodes {
                    id
                    name
                }
            }
        }
    }`
}

const findDraftReleaseQuery = (): string => {
  return `
    query FindDraftRelease ($owner: String!, $repo: String!, $project: String!, $branch: String!, $labels: [String!]){
        repository(owner: $owner, name: $repo) {
              id
              url
              tags: refs(last: 1, refPrefix: "refs/tags/", query: $project) {
                  tags: nodes {
                      id
                      name
                  }
              }
              branches: refs(last: 1, refPrefix: "refs/heads/", query: $branch) {
                  branches: nodes {
                      id
                      name
                  }
              }
              releaseLabel: label(name: "release") {
                  id
                  name
              }
              projectLabel: label(name: $project) {
                  id
                  name
              }
              pullRequests(last: 1, headRefName: $branch, labels: $labels, states: OPEN) {
                  pullRequests: nodes {
                      id
                      number
                      title
                      body
                      createdAt
                      lastEditedAt
                      baseRefName
                      baseRefOid
                      headRefName
                      headRefOid
                      author {
                          login
                      }
                      comments(last: 10) {
                          comments: nodes {
                              id
                              author {
                                  login
                              }
                              body
                          }
                      }
                  }
              }
          }
    }`
}

export const extractProjectNameFromPR = (text: string): string | null => {
  const match = text.match(/\[\/\/]:\s#\s\(krytenbot-project:(\w+)\)/)
  return match ? match[1] : null
}

export const extractProjectVersionFromPR = (text: string): string | null => {
  const match = text.match(/\[\/\/]:\s#\s\(krytenbot-version:(\d+\.\d+\.\d+)\)/)
  return match ? match[1] : null
}

/**
 * Get the release branch name for the project.
 * @param project
 */
export const getReleaseBranchName = (project: string): string => {
  return `krytenbot-${project}`
}

/**
 * Get the title for the PR.
 * @param project
 * @param nextVersion
 */
const getPullRequestTitle = (project: string, nextVersion: string): string => {
  return `Release \`${project}\` v${nextVersion}`
}

/**
 * Get the default next version.
 */
const getDefaultNextVersion = (): string => {
  return '0.0.1'
}

/**
 * Return the body of the PR text.
 * @param project
 * @param nextVersion
 * @param githubReleaseUrl
 * @param rebasing
 */
const getPullRequestBody = (project: string, nextVersion: string, githubReleaseUrl: string, rebasing: boolean = false): string => {
  const body: string[] = []

  body.push(hidden(`krytenbot-project:${project}`))
  body.push('\n')
  body.push(hidden(`krytenbot-version:${nextVersion}`))
  body.push('\n\n')

  if (rebasing) {
    body.push(hidden('krytenbot-start'))
    body.push('\n\n')
    body.push(important('Krytenbot is rebasing this PR'))
    body.push('\n\n')
    body.push(hidden('krytenbot-end'))
    body.push('\n')
  }

  body.push(`
This PR was created automatically by the Krytenbot to track the next release. 
The next version for this release is v${nextVersion}.

You can find the release notes for this version [here](${githubReleaseUrl}).

---

<details>
<summary>Krytenbot commands and options</summary>
<br />

You can trigger Krytenbot actions by commenting on this PR:
- \`@krytenbot rebase\` will rebase this PR
- \`@krytenbot recreate\` will recreate this PR, overwriting any edits that have been made to it
- \`@krytenbot setversion [major|minor|patch]\` will set the version for this PR
</details>
  `)

  return body.join('')
}

/**
 * List all files that were added, modified, or removed in the push event.
 * @param octokit
 * @param payload
 */
export const listPushCommitFiles = async (octokit: Octokit, payload: PushEvent): Promise<string[]> => {
  const files = new Set<string>()

  // If the push event has a list of commits, use that to get the list of files, otherwise
  // get the list of files from the commit details.
  for (const commit of payload.commits) {
    if (commit.added || commit.modified || commit.removed) {
      core.debug(`Commit contained file details: ${JSON.stringify(commit, null, 2)}`)
      commit.added.forEach(file => files.add(file))
      commit.modified.forEach(file => files.add(file))
      commit.removed.forEach(file => files.add(file))
    } else {
      core.debug(`Commit contained no file details. Getting commit details for: ${payload.after}`)
      const { data: commitDetails } = await octokit.rest.repos.getCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: payload.after
      })
      // const commitDetails = await octokit.graphql(findCommitQuery(), {
      //   owner: github.context.repo.owner,
      //   repo: github.context.repo.repo,
      //   oid: payload.after
      // })

      core.info(`Commit Details: ${JSON.stringify(commitDetails, null, 2)}`)
      commitDetails.files?.forEach(file => files.add(file.filename))
    }
  }

  return Array.from(files)
}

/**
 * List all projects that are relevant to the files that were changed.
 * @param projects
 * @param files
 */
export const listProjectsOfRelevance = (projects: ConfigProject[], files: string[]): ConfigProject[] => {
  const relevantProjects = new Set<ConfigProject>()
  files.forEach(file => {
    projects.forEach(project => {
      project.paths.forEach(path => {
        if (minimatch(file, path)) {
          relevantProjects.add(project)
        }
      })
    })
  })
  return Array.from(relevantProjects)
}

/**
 * Get the number of days between two dates.
 * @param d1
 * @param d2
 */
const daysBetween = (d1: Date, d2: Date): number => {
  const diff = Math.abs(d1.getTime() - d2.getTime())
  return diff / (1000 * 60 * 60 * 24)
}

/**
 * Helper const to get the pull request from the draft release.
 * @param draftRelease
 */
export const getPullRequest = (draftRelease: KrytenbotDraftRelease): PullRequest | undefined => {
  return draftRelease.pullRequests.pullRequests.length > 0 ? draftRelease.pullRequests.pullRequests[0] : undefined
}

/**
 * Get the last comment on the pull request.
 * @param draftRelease
 */
export const getLastComment = (draftRelease: KrytenbotDraftRelease): Comment | undefined => {
  const pullRequest = getPullRequest(draftRelease)
  if (pullRequest) {
    if (pullRequest.comments.comments.length > 0) {
      return pullRequest.comments.comments[0]
    }
  }
  return undefined
}

/**
 * Check if the pull request is too old.
 * @param draftRelease
 * @param limit
 */
export const isPullRequestTooOld = (draftRelease: KrytenbotDraftRelease, limit: number): boolean => {
  const pullRequest = getPullRequest(draftRelease)
  if (pullRequest) {
    const daysOld = daysBetween(new Date(pullRequest.createdAt), new Date())
    return daysOld > limit
  }
  return false
}

/**
 * Update the version for the project.
 * @param octokit
 * @param packageEcoSystem
 * @param project
 * @param version
 * @param sha
 */
export const setReleaseBranchVersion = async (octokit: Octokit, packageEcoSystem: string, project: string, version: string, sha: string): Promise<void> => {
  const branch: string = getReleaseBranchName(project)

  const {
    repository: { file: existingFile }
  }: GraphQlQueryResponseData = await octokit.graphql(getFileContentQuery(), {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `${branch}:${project}/${versions.getPackagePath(packageEcoSystem)}`
  })
  core.debug(`Existing File: ${JSON.stringify(existingFile, null, 2)}`)

  const newFileContents = versions.patchVersion(packageEcoSystem, existingFile.content, version)
  const createCommitOnBranch: GraphQlQueryResponseData = await octokit.graphql(createCommitOnBranchMutation(), {
    branch: {
      repositoryNameWithOwner: `${github.context.repo.owner}/${github.context.repo.repo}`,
      branchName: branch
    },
    message: { headline: `Update ${project} version to v${version}` },
    expectedHeadOid: sha,
    fileChanges: {
      additions: [
        {
          path: `${project}/${versions.getPackagePath(packageEcoSystem)}`,
          contents: base64.encode(newFileContents)
        }
      ]
    }
  })
  core.debug(`Updated File: ${JSON.stringify(createCommitOnBranch, null, 2)}`)
}

/**
 * Rebase the next calculated version.
 * @param draftRelease
 * @param versionType
 */
export const getNextVersion = (draftRelease: KrytenbotDraftRelease, versionType: Version): string => {
  for (const tag of draftRelease.tags.tags) {
    const tagName = tag.name
    const tagVersion = tagName.substring(tagName.indexOf('@v') + 2)

    if (draftRelease.pullRequests.pullRequests.length > 0) {
      const {
        pullRequests: { pullRequests }
      } = draftRelease
      for (const comment of pullRequests[0].comments.comments) {
        const commentBody = comment.body
        if (commentBody.startsWith(Commands.SetVersion)) {
          const nextVersionType = commentBody.split(' ')[2]
          const nextVersion = semver.inc(tagVersion, nextVersionType as Version)
          if (nextVersion) {
            return nextVersion
          }
        }
      }
    }

    const nextVersion = semver.inc(tagVersion, versionType)
    if (nextVersion) {
      return nextVersion
    }
  }

  return getDefaultNextVersion()
}

/**
 * Find the details of the draft release.
 * @param octokit
 * @param project
 */
export const findDraftRelease = async (octokit: Octokit, project: string): Promise<KrytenbotDraftRelease> => {
  const pullRequests: GraphQlQueryResponseData = await octokit.graphql(findDraftReleaseQuery(), {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    project,
    branch: getReleaseBranchName(project),
    labels: ['release', project]
  })
  core.debug(`Pull Request: ${JSON.stringify(pullRequests, null, 2)}`)
  return pullRequests.repository
}

/**
 * Create a new branch for the release.
 * @param octokit
 * @param draftRelease
 * @param project
 */
export const createReleaseBranch = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease, project: string): Promise<void> => {
  const releaseBranch: string = getReleaseBranchName(project)
  const branch: GraphQlQueryResponseData = await octokit.graphql(createRefMutation(), {
    repositoryId: draftRelease.id,
    name: `refs/heads/${releaseBranch}`,
    oid: github.context.sha
  })
  core.debug(`Created Branch: ${JSON.stringify(branch, null, 2)}`)
}

/**
 * Update the draft release branch by rebasing it.
 * @param octokit
 * @param draftRelease
 */
export const updateReleaseBranch = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease): Promise<void> => {
  const branch: GraphQlQueryResponseData = await octokit.graphql(updatePullRequestBranchMutation(), {
    pullRequestId: draftRelease.pullRequests.pullRequests[0].id
  })
  core.debug(`Updated Branch: ${JSON.stringify(branch, null, 2)}`)
}

/**
 * Recreate the release branch.
 * @param octokit
 * @param draftRelease
 */
export const recreateReleaseBranch = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease): Promise<void> => {
  const branch: GraphQlQueryResponseData = await octokit.graphql(updateRefMutation(), {
    refId: draftRelease.branches.branches[0].id,
    oid: github.context.sha
  })
  core.debug(`Recreated Branch: ${JSON.stringify(branch, null, 2)}`)
}

/**
 * Create draft release pull request.
 * @param octokit
 * @param draftRelease
 * @param project
 * @param branch
 * @param nextVersion
 */
export const createPullRequest = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease, project: string, branch: string, nextVersion: string): Promise<void> => {
  const releaseBranch: string = getReleaseBranchName(project)

  const pullRequest: GraphQlQueryResponseData = await octokit.graphql(createPullRequestMutation(), {
    repositoryId: draftRelease.id,
    baseRefName: branch,
    headRefName: releaseBranch,
    title: getPullRequestTitle(project, nextVersion),
    body: getPullRequestBody(project, nextVersion, `${draftRelease.url}/releases`)
  })
  core.debug(`Created pull request: ${JSON.stringify(pullRequest, null, 2)}`)

  const pullRequestLabels: GraphQlQueryResponseData = await octokit.graphql(updatePullRequestLabelsMutation(), {
    pullRequestId: pullRequest.createPullRequest.pullRequest.id,
    labelIds: [draftRelease.releaseLabel.id, draftRelease.projectLabel.id]
  })
  core.debug(`Updated pull request labels: ${JSON.stringify(pullRequestLabels, null, 2)}`)
}

/**
 * Add a comment to the pull request.
 * @param octokit
 * @param issueId
 * @param body
 */
export const addComment = async (octokit: Octokit, issueId: string, body: string): Promise<void> => {
  const response: GraphQlQueryResponseData = await octokit.graphql(addCommentMutation(), {
    subjectId: issueId,
    body
  })
  core.debug(`Added comment: ${JSON.stringify(response, null, 2)}`)
}

/**
 * Add a comment to the pull request if it doesn't already exist.
 * @param octokit
 * @param draftRelease
 * @param body
 */
export const addCommentIfRequired = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease, body: string): Promise<void> => {
  const pullRequest = getPullRequest(draftRelease)
  if (pullRequest) {
    const lastComment = getLastComment(draftRelease)
    if (!lastComment || lastComment.body !== body) {
      await addComment(octokit, pullRequest.id, body)
    }
  }
}

/**
 * Add a reaction to a comment.
 * @param octokit
 * @param commentId
 * @param reaction
 */
export const addCommentReaction = async (octokit: Octokit, commentId: string, reaction: Reaction): Promise<void> => {
  const response: GraphQlQueryResponseData = await octokit.graphql(addReactionMutation(), {
    subjectId: commentId,
    content: reaction
  })
  core.debug(`Added comment reaction: ${JSON.stringify(response, null, 2)}`)
}

/**
 * Update the pull request title.
 * @param octokit
 * @param draftRelease
 * @param project
 * @param nextVersion
 */
export const updatePullRequestTitleAndBody = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease, project: string, nextVersion: string): Promise<void> => {
  const pullRequestLabels: GraphQlQueryResponseData = await octokit.graphql(updatePullRequestTitleAndBodyMutation(), {
    pullRequestId: draftRelease.pullRequests.pullRequests[0].id,
    title: getPullRequestTitle(project, nextVersion),
    body: getPullRequestBody(project, nextVersion, `${draftRelease.url}/releases`)
  })
  core.debug(`Updated pull request title: ${JSON.stringify(pullRequestLabels, null, 2)}`)
}

/**
 * Reopen the pull request.
 * @param octokit
 * @param draftRelease
 */
export const reopenPullRequest = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease): Promise<void> => {
  const pullRequestLabels: GraphQlQueryResponseData = await octokit.graphql(reopenPullRequestMutation(), {
    pullRequestId: draftRelease.pullRequests.pullRequests[0].id
  })
  core.debug(`Reopened pull request: ${JSON.stringify(pullRequestLabels, null, 2)}`)
}

/**
 * Find the last tag in the repository.
 * @param octokit
 * @param project
 */
export const findLastTag = async (octokit: Octokit, project: string): Promise<string | undefined> => {
  const tag: GraphQlQueryResponseData = await octokit.graphql(findLatestTagQuery(), {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    project
  })
  core.debug(`Found tag: ${JSON.stringify(tag, null, 2)}`)
  return tag.repository.tags.tags.length > 0 ? tag.repository.tags.tags[0].name : undefined
}

/**
 * Generate the release notes for the project.
 * @param octokit
 * @param project
 * @param version
 */
export const generateGithubReleaseNotes = async (octokit: Octokit, project: string, version: string): Promise<string> => {
  const lastTag = await findLastTag(octokit, project)
  const releaseNotes: GenerateReleaseNotesResponse = await octokit.rest.repos.generateReleaseNotes({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tag_name: `${project}@v${version}`,
    previous_tag_name: lastTag,
    configuration_file_path: `.github/release-${project}.yml`
  })
  core.debug(`Generated release notes: ${JSON.stringify(releaseNotes, null, 2)}`)
  return releaseNotes.data.body
}

/**
 * Create a new release in GitHub.
 * @param octokit
 * @param project
 * @param version
 */
export const createGitHubRelease = async (octokit: Octokit, project: string, version: string): Promise<GitDraftHubRelease | undefined> => {
  const lastTag = await findLastTag(octokit, project)
  const releaseNotes = await generateGithubReleaseNotes(octokit, project, version)
  const release: CreateReleaseResponse = await octokit.rest.repos.createRelease({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tag_name: `${project}@v${version}`,
    previous_tag_name: lastTag,
    name: `${project}@v${version}`,
    body: releaseNotes,
    draft: true
  })
  core.debug(`Created release: ${JSON.stringify(release, null, 2)}`)
  return release.data
}

/**
 * Publish the draft release in GitHub.
 * @param octokit
 * @param release_id
 * @param project
 * @param version
 */
export const publishGitHubRelease = async (octokit: Octokit, release_id: number, project: string, version: string): Promise<GitDraftHubRelease> => {
  const releaseNotes = await generateGithubReleaseNotes(octokit, project, version)
  const updatedRelease: UpdateReleaseResponse = await octokit.rest.repos.updateRelease({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    release_id,
    tag_name: `${project}@v${version}`,
    name: `${project}@v${version}`,
    body: releaseNotes,
    draft: false
  })
  core.debug(`Publish release: ${JSON.stringify(updatedRelease, null, 2)}`)
  return updatedRelease.data
}

/**
 * Update the GitHub release.
 * @param octokit
 * @param release_id
 * @param project
 * @param version
 */
export const updateGitHubRelease = async (octokit: Octokit, release_id: number, project: string, version: string): Promise<GitDraftHubRelease> => {
  const releaseNotes = await generateGithubReleaseNotes(octokit, project, version)
  const updatedRelease: UpdateReleaseResponse = await octokit.rest.repos.updateRelease({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    release_id,
    tag_name: `${project}@v${version}`,
    name: `${project}@v${version}`,
    body: releaseNotes
  })
  core.debug(`Updated release: ${JSON.stringify(updatedRelease, null, 2)}`)
  return updatedRelease.data
}

/**
 * Find the draft release in GitHub.
 * @param octokit
 * @param project
 * @param version
 */
export const findGitHubDraftRelease = async (octokit: Octokit, project: string, version: string): Promise<GitDraftHubRelease | undefined> => {
  const releases: ListReleasesResponse = await octokit.rest.repos.listReleases({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })
  core.debug(`Releases: ${JSON.stringify(releases, null, 2)}`)
  return releases.data.find(release => `${project}@v${version}` === release.name && release.draft)
}
