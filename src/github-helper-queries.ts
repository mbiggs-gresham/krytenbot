export const createRefMutation = (): string => {
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

export const updateRefMutation = (): string => {
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

export const createCommitOnBranchMutation = (): string => {
  return `
    mutation CreateCommitOnBranch($branch: CommittableBranch!, $message: CommitMessage!, $expectedHeadOid: GitObjectID!, $fileChanges: FileChanges) {
        createCommitOnBranch(input:{ clientMutationId: "krytenbot", branch: $branch, message: $message, expectedHeadOid: $expectedHeadOid, fileChanges: $fileChanges }) {
            commit {
                oid
            }
        }
    }`
}

export const createPullRequestMutation = (): string => {
  return `
    mutation CreatePullRequest($repositoryId: ID!, $baseRefName: String!, $headRefName: String!, $title: String!, $body: String!) {
        createPullRequest(input:{ clientMutationId: "krytenbot", repositoryId: $repositoryId, baseRefName: $baseRefName, headRefName: $headRefName, title: $title, body: $body, draft: true }) {
            pullRequest {
                id
            }
        }
    }`
}

export const updatePullRequestLabelsMutation = (): string => {
  return `
    mutation UpdatePullRequestLabels($pullRequestId: ID!, $labelIds: [ID!]) {
        updatePullRequest(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId, labelIds: $labelIds }) {
            pullRequest {
                id
            }
        }
    }`
}

export const updatePullRequestTitleAndBodyMutation = (): string => {
  return `
    mutation UpdatePullRequestLabels($pullRequestId: ID!, $title: String, $body: String) {
        updatePullRequest(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId, title: $title, body: $body }) {
            pullRequest {
                id
            }
        }
    }`
}

export const updatePullRequestBranchMutation = (): string => {
  return `
    mutation UpdatePullRequestBranch($pullRequestId: ID!) {
        updatePullRequestBranch(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId, updateMethod: REBASE }) {
            pullRequest {
                id
            }
        }
    }`
}

export const reopenPullRequestMutation = (): string => {
  return `
    mutation ReopenPullRequest($pullRequestId: ID!) {
        reopenPullRequest(input:{ clientMutationId: "krytenbot", pullRequestId: $pullRequestId }) {
            pullRequest {
                id
            }
        }
    }`
}

export const addReactionMutation = (): string => {
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

export const addCommentMutation = (): string => {
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

export const getFileContentQuery = (): string => {
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

// export const findCommitQuery = (): string => {
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

export const findLatestTagQuery = (): string => {
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

export const findDraftReleaseQuery = (): string => {
  return `
    query FindDraftRelease ($owner: String!, $repo: String!, $project: String!, $branch: String!, $labels: [String!]) {
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
