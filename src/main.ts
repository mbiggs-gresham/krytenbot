import { App, Octokit } from 'octokit'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { IssueCommentEvent, PullRequestEvent, PushEvent } from '@octokit/webhooks-types'
import fetch from 'node-fetch'
import * as githubapi from './github-helper'
import * as versions from './version-helper'
import * as config from './config-helper'
import { Commands, KrytenbotDraftRelease, Version } from './github-helper'
import { note, caution } from './markdown-helper'
import { Config, ConfigProject } from './config-helper'
import { Fetch } from '@octokit/types'

enum Events {
  Push = 'push',
  PullRequest = 'pull_request',
  IssueComment = 'issue_comment'
}

const DAYS_OLD = 30
const BOT_NAME = 'krytenbot[bot]'

/**
 * The fetch implementation to use.
 */
export const getFetch = (): Fetch => fetch

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export const run = async (): Promise<void> => {
  try {
    core.startGroup('GitHub Context')
    core.info(JSON.stringify(github.context, null, 2))
    core.endGroup()

    const appId = core.getInput('app_id')
    const privateKey = core.getInput('private_key')

    const app: App = new App({
      appId,
      privateKey,
      octokit: Octokit.defaults({
        request: {
          fetch: getFetch()
        }
      })
    })
    core.endGroup()

    core.info('Getting installation ID')
    const { data: installation } = await app.octokit.rest.apps.getRepoInstallation({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })

    const octokit: Octokit = await app.getInstallationOctokit(installation.id)
    const configuration = await config.getConfig(octokit)
    core.startGroup('Configuration')
    core.info(JSON.stringify(configuration, null, 2))
    core.endGroup()

    if (configuration) {
      /**
       * Handle Pull request being merged
       */
      if (github.context.eventName === Events.PullRequest) {
        await pullRequestEvent(configuration, octokit)
      }

      /**
       * Handle commits being pushed to the branch we are monitoring
       */
      if (github.context.eventName === Events.Push) {
        await pushEvent(configuration, octokit)
      }

      /**
       * Handle PRs being commented on
       */
      if (github.context.eventName === Events.IssueComment) {
        await issueCommentEvent(configuration, octokit)
      }
    } else {
      core.setFailed("No configuration found at '.github/krytenbot.yml'")
    }
  } catch (error) {
    console.log('Error:', error)
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
  console.log('Finished.')
}

/**
 * Handles the pull request event.
 * @param config
 * @param octokit
 */
const pullRequestEvent = async (config: Config, octokit: Octokit): Promise<void> => {
  const pullRequestPayload: PullRequestEvent = github.context.payload as PullRequestEvent

  try {
    if (pullRequestPayload.pull_request.labels.some(label => label.name === 'release') && pullRequestPayload.pull_request.user.login === BOT_NAME) {
      const project = githubapi.extractProjectNameFromPR(pullRequestPayload.pull_request.body!)
      const version = githubapi.extractProjectVersionFromPR(pullRequestPayload.pull_request.body!)
      if (project && version) {
        core.info(`Creating release for '${project}'`)
        const draftGithubRelease = await githubapi.findGitHubDraftRelease(octokit, project, version)
        if (draftGithubRelease) {
          await githubapi.publishGitHubRelease(octokit, draftGithubRelease?.id, project, version)
        } else {
          core.setFailed(`No draft GitHub release found for '${project}'`)
        }
      } else {
        core.setFailed('No project or version found in pull request body')
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

/**
 * Handles the push event.
 * @param config
 * @param octokit
 */
const pushEvent = async (config: Config, octokit: Octokit): Promise<void> => {
  const pushPayload: PushEvent = github.context.payload as PushEvent

  const wasReleasePush: boolean = pushPayload.commits.some(commit => commit.author.name === BOT_NAME)
  if (!wasReleasePush) {
    core.startGroup('Files Changed in Push')
    const files = await githubapi.listPushCommitFiles(octokit, pushPayload)
    files.forEach(file => core.info(file))
    core.endGroup()

    core.startGroup('Projects of Relevance')
    const projectsOfRelevance = githubapi.listProjectsOfRelevance(config.projects, files)
    projectsOfRelevance.forEach(projectOfRelevance => core.info(projectOfRelevance.name))
    core.endGroup()

    for (const project of projectsOfRelevance) {
      core.startGroup(`Checking for draft release info for '${project.name}'`)

      const releaseBranch = `krytenbot-${project.name}`
      const draftRelease: KrytenbotDraftRelease = await githubapi.findDraftRelease(octokit, project.name)
      const pullRequest = githubapi.getPullRequest(draftRelease)
      core.info(`Draft Release: ${JSON.stringify(draftRelease, null, 2)}`)

      if (!githubapi.isPullRequestTooOld(draftRelease, DAYS_OLD)) {
        core.info(`Calculating next version for '${project.name}'`)
        const nextVersion: string = githubapi.getNextVersion(draftRelease, 'patch')
        core.info(`Next version for '${project.name}': ${nextVersion}`)

        // Create new branch with new version or rebase the existing one
        core.info(`Checking for release branch for '${project.name}'`)
        if (!draftRelease.branches.branches.some(branch => branch.name === releaseBranch)) {
          core.info(`Creating release branch for '${project.name}'`)
          await githubapi.createReleaseBranch(octokit, draftRelease, project.name)
          core.info(`Updating '${project.name}' version to ${nextVersion}`)
          await githubapi.setReleaseBranchVersion(octokit, project['package-ecosystem'], project.name, nextVersion, github.context.sha)
        }

        // Create draft GitHub release
        core.info(`Checking for GitHub release for '${project.name}'`)
        const draftGithubRelease = await githubapi.findGitHubDraftRelease(octokit, project.name, nextVersion)
        if (!draftGithubRelease) {
          core.info(`Creating GitHub release for '${project.name}'`)
          await githubapi.createGitHubRelease(octokit, project.name, nextVersion)
        } else {
          core.info(`Updating GitHub release for '${project.name}'`)
          await githubapi.updateGitHubRelease(octokit, draftGithubRelease.id, project.name, nextVersion)
        }

        // Create pull request for new branch
        core.info(`Checking for pull request for '${project.name}'`)
        if (!pullRequest) {
          core.info(`Creating pull request for '${project.name}'`)
          const branch = github.context.ref.substring('refs/heads/'.length)
          await githubapi.createPullRequest(octokit, draftRelease, project.name, branch, nextVersion)
        } else {
          core.info(`Updating release branch for '${project.name}'`)
          try {
            await githubapi.updateReleaseBranch(octokit, draftRelease)
          } catch (error) {
            const commentText = caution(`An error occurred trying to rebase this pull request. Please try manually.`)
            await githubapi.addCommentIfRequired(octokit, draftRelease, commentText)
          }
        }
      } else {
        const commentText = note(`This pull request is older than ${DAYS_OLD} days and will be ignored. Use \`${Commands.Rebase}\` to rebase it when ready.`)
        await githubapi.addCommentIfRequired(octokit, draftRelease, commentText)
        core.warning(`Release branch is older than ${DAYS_OLD} days. Ignoring...`)
      }

      core.endGroup()
    }
  } else {
    core.info(`Ignoring push event as it included commits by ${BOT_NAME}. This was most likely a release push.`)
  }
}

/**
 * Handles the issue comment event.
 * @param config
 * @param octokit
 */
const issueCommentEvent = async (config: Config, octokit: Octokit): Promise<void> => {
  const comment: IssueCommentEvent = github.context.payload as IssueCommentEvent

  const project = githubapi.extractProjectNameFromPR(comment.issue.body!)
  if (project) {
    core.info(`Issue comment found for '${project}'`)

    const draftRelease = await githubapi.findDraftRelease(octokit, project)
    core.info(`Draft Release: ${JSON.stringify(draftRelease, null, 2)}`)

    if (comment.comment.body.startsWith(Commands.SetVersion)) {
      await issueCommentEventSetVersion(config, octokit, draftRelease, project, comment)
    }

    if (comment.comment.body.startsWith(Commands.Rebase)) {
      await issueCommentEventRebase(octokit, draftRelease, project, comment)
    }

    if (comment.comment.body.startsWith(Commands.Recreate)) {
      await issueCommentEventRecreate(config, octokit, draftRelease, project, comment)
    }
  } else {
    core.warning('No project for pull request found')
  }
}

/**
 * Handles the issue comment event for setting the version.
 * @param config
 * @param octokit
 * @param draftRelease
 * @param project
 * @param comment
 */
const issueCommentEventSetVersion = async (config: Config, octokit: Octokit, draftRelease: KrytenbotDraftRelease, project: string, comment: IssueCommentEvent): Promise<void> => {
  const versionType = comment.comment.body.split(' ')[2]
  if (versions.isValidSemverVersionType(versionType)) {
    core.info(`Calculating new version for '${project}'`)
    const nextVersion = githubapi.getNextVersion(draftRelease, versionType as Version)
    core.info(`New version for '${project}': ${nextVersion}`)

    core.info(`Updating '${project}' version to ${nextVersion}`)
    try {
      const projectConfig = config.projects.find((projectConfig: ConfigProject) => projectConfig.name === project)
      if (projectConfig) {
        await githubapi.addCommentReaction(octokit, String(comment.comment.node_id), 'THUMBS_UP')
        await githubapi.setReleaseBranchVersion(octokit, projectConfig['package-ecosystem'], project, nextVersion, draftRelease.pullRequests.pullRequests[0].headRefOid)
        await githubapi.updatePullRequestTitleAndBody(octokit, draftRelease, project, nextVersion)
      }
    } catch (error) {
      await githubapi.addComment(octokit, comment.issue.node_id, caution('Failed to set the version. Please check the logs for more details.'))
      if (error instanceof Error) core.setFailed(error.message)
    }
  } else {
    core.setFailed(`Invalid version type: ${versionType}`)
  }
}

/**
 * Handles the issue comment event for rebasing the branch.
 * @param octokit
 * @param draftRelease
 * @param project
 * @param comment
 */
const issueCommentEventRebase = async (octokit: Octokit, draftRelease: KrytenbotDraftRelease, project: string, comment: IssueCommentEvent): Promise<void> => {
  core.info(`Updating release branch for '${project}'`)
  try {
    await githubapi.addCommentReaction(octokit, String(comment.comment.node_id), 'THUMBS_UP')
    await githubapi.updateReleaseBranch(octokit, draftRelease)
  } catch (error) {
    await githubapi.addComment(octokit, comment.issue.node_id, caution('Failed to rebase the branch. Please either manually rebase it or use the `recreate` command.'))
    if (error instanceof Error) core.setFailed(error.message)
  }
}

/**
 * Handles the issue comment event for recreating the branch.
 * @param config
 * @param octokit
 * @param draftRelease
 * @param project
 * @param comment
 */
const issueCommentEventRecreate = async (config: Config, octokit: Octokit, draftRelease: KrytenbotDraftRelease, project: string, comment: IssueCommentEvent): Promise<void> => {
  core.info(`Recreating release branch for '${project}'`)
  try {
    await githubapi.addCommentReaction(octokit, String(comment.comment.node_id), 'THUMBS_UP')

    core.info(`Calculating new version for '${project}'`)
    const nextVersion = githubapi.getNextVersion(draftRelease, 'patch')
    core.info(`New version for '${project}': ${nextVersion}`)

    const projectConfig = config.projects.find((projectConfig: ConfigProject) => projectConfig.name === project)
    if (projectConfig) {
      await githubapi.recreateReleaseBranch(octokit, draftRelease)
      await githubapi.setReleaseBranchVersion(octokit, projectConfig['package-ecosystem'], project, nextVersion, draftRelease.pullRequests.pullRequests[0].baseRefOid)
      await githubapi.updatePullRequestTitleAndBody(octokit, draftRelease, project, nextVersion)
      await githubapi.reopenPullRequest(octokit, draftRelease) // Make sure the PR is open as GitHub closes is when the branch is identical to the base.
    }
  } catch (error) {
    await githubapi.addComment(octokit, comment.issue.node_id, caution('Failed to recreate the branch. Please check the logs for more details.'))
    if (error instanceof Error) core.setFailed(error.message)
  }
}
