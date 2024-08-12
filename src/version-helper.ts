const semverVersionTypes = ['major', 'minor', 'patch']

/**
 * This function will take the contents of a package.json file and replace the version number with the next version number.
 * @param fileContents
 * @param nextVersion
 */
export function patchPackageJson(fileContents: string, nextVersion: string): string {
  return fileContents.replace(/"version": "(.*)"/, `"version": "${nextVersion}"`)
}

/**
 * This function will take the contents of a file and replace the version number with the next version number.
 * @param packageEcoSystem
 * @param fileContents
 * @param nextVersion
 */
export function patchVersion(packageEcoSystem: string, fileContents: string, nextVersion: string): string {
  switch (packageEcoSystem) {
    case 'npm':
      return patchPackageJson(fileContents, nextVersion)
    default:
      throw new Error(`Unsupported package ecosystem: ${packageEcoSystem}`)
  }
}

/**
 * This function will take a package ecosystem and return the path to the package file.
 * @param packageEcoSystem
 */
export function getPackagePath(packageEcoSystem: string): string {
  switch (packageEcoSystem) {
    case 'npm':
      return 'package.json'
    default:
      throw new Error(`Unsupported package ecosystem: ${packageEcoSystem}`)
  }
}

/**
 * This function will take a version number and return the next version number based on the version type.
 * @param version
 */
export function isValidSemverVersionType(version: string): boolean {
  return semverVersionTypes.includes(version)
}
