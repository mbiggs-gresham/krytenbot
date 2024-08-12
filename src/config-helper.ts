import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import { Octokit } from 'octokit'
import { Endpoints } from '@octokit/types'

type GetContentResponse = Endpoints['GET /repos/{owner}/{repo}/contents/{path}']['response']

export interface ConfigProject {
  name: string
  paths: string[]
  'package-ecosystem': string
}

export interface Config {
  projects: ConfigProject[]
}

/**
 * Get the configuration file from the repository
 * @param octokit
 */
export async function getConfig(octokit: Octokit): Promise<Config | undefined> {
  const response: GetContentResponse = await octokit.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: '.github/krytenbot.yml',
    ref: github.context.sha
  })
  core.debug(`Response: ${JSON.stringify(response)}`)

  if (!Array.isArray(response.data)) {
    if (response.data.type === 'file' && response.data.size > 0) {
      const content = Buffer.from(response.data.content, 'base64').toString()
      return yaml.load(content) as Config
    }
  }

  return undefined
}
