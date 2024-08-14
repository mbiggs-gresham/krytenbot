import { it, describe, expect, vi } from 'vitest'
import * as yaml from 'js-yaml'
import { Config, getConfig } from '../src/config-helper'
import { type Octokit } from 'octokit'

const configuration: Config = {
  projects: [
    {
      name: 'test',
      paths: ['test/**'],
      'package-ecosystem': 'npm'
    }
  ]
}

const content = Buffer.from(yaml.dump(configuration), 'utf-8').toString('base64')

describe('config-helper', () => {
  vi.mock('@actions/github', () => ({
    context: {
      repo: {
        owner: 'mbiggs-gresham',
        repo: 'krytenbot'
      }
    }
  }))

  it('returns valid config correctly', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: async () => ({
            data: {
              type: 'file',
              size: 100,
              content
            }
          })
        }
      }
    } as Octokit

    const config = await getConfig(octokit)
    expect(config).toEqual(configuration)
  })

  it('doesnt return invalid config correctly', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: async () => ({
            data: {
              type: 'file',
              size: 100,
              content: ''
            }
          })
        }
      }
    } as Octokit

    const config = await getConfig(octokit)
    expect(config).toEqual(undefined)
  })
})
