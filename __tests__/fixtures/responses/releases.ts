export const releasesEmptyResponse = (): object => []

export const releasesCreatedResponse = (): object => ({
  id: 1,
  tag_name: 'test@v0.0.1',
  name: 'test@v0.0.1',
  body: 'Description of the release',
  draft: true
})

export const releasesResponse = (): object => [
  {
    id: 1,
    tag_name: 'test@v0.0.1',
    name: 'test@v0.0.1',
    body: 'Description of the release',
    draft: true
  }
]

export const releasesPublishedResponse = (): object => [
  {
    id: 1,
    tag_name: 'test@v0.0.1',
    name: 'test@v0.0.1',
    body: 'Description of the release',
    draft: false
  }
]
