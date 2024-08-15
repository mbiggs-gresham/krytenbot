import { Config } from '../../../src/config-helper'
import * as yaml from 'js-yaml'

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

export const contentsResponse = (): object => ({
  type: 'file',
  encoding: 'base64',
  size: 100,
  name: 'krytenbot.yml',
  path: '.github/krytenbot.yml',
  content
})
