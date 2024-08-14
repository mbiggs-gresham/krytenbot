import { it, describe, expect } from 'vitest'
import { patchPackageJson, patchVersion, isValidSemverVersionType, getPackagePath } from '../src/version-helper'

describe('version-helper', () => {
  it('is a valid semver version', () => {
    const versions = ['major', 'minor', 'patch']
    versions.forEach(version => {
      expect(isValidSemverVersionType(version)).toBe(true)
    })
  })

  it('is not a valid semver version', () => {
    const versions = ['foo', 'bar', 'baz']
    versions.forEach(version => {
      expect(isValidSemverVersionType(version)).toBe(false)
    })
  })

  it('gets the correct package path', () => {
    expect(getPackagePath('npm')).toBe('package.json')
  })

  it('patches package.json', () => {
    const fileContents = `{
      "name": "test",
      "version": "1.0.0"
    }`
    const nextVersion = '1.0.1'
    const expected = `{
      "name": "test",
      "version": "${nextVersion}"
    }`
    expect(patchPackageJson(fileContents, nextVersion)).toBe(expected)
  })

  it('patches the version for the correct ecosystem', () => {
    const fileContents = `{
      "name": "test",
      "version": "1.0.0"
    }`
    const nextVersion = '1.0.1'
    const expected = `{
      "name": "test",
      "version": "${nextVersion}"
    }`
    expect(patchVersion('npm', fileContents, nextVersion)).toBe(expected)
  })
})
