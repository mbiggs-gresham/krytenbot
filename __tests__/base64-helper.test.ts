import { it, describe, expect } from 'vitest'
import { encode, decode } from '../src/base64-helper'

describe('base64-helper', () => {
  it('encodes a string', () => {
    const encoded = encode('hello world')
    expect(encoded).toBe('aGVsbG8gd29ybGQ=')
  })

  it('decodes a string', () => {
    const decoded = decode('aGVsbG8gd29ybGQ=')
    expect(decoded).toBe('hello world')
  })
})
