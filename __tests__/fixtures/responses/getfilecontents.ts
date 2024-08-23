export const getFileContentsResponse = (): object => ({
  data: {
    repository: {
      file: {
        content: '{ "name": "test" "version": "0.0.1" }'
      }
    }
  }
})
