import { it, describe, expect } from 'vitest'
import { caution, hidden, important, note, tip, warning } from '../src/markdown-helper'

describe('markdown-helper', () => {
  it('returns the correct markdown for a note', () => {
    expect(note('This is a note')).toBe('> [!NOTE]\n> This is a note')
  })

  it('returns the correct markdown for a tip', () => {
    expect(tip('This is a tip')).toBe('> [!TIP]\n> This is a tip')
  })

  it('returns the correct markdown for an important', () => {
    expect(important('This is an important')).toBe('> [!IMPORTANT]\n> This is an important')
  })

  it('returns the correct markdown for a warning', () => {
    expect(warning('This is a warning')).toBe('> [!WARNING]\n> This is a warning')
  })

  it('returns the correct markdown for a caution', () => {
    expect(caution('This is a caution')).toBe('> [!CAUTION]\n> This is a caution')
  })

  it('returns the correct markdown for a hidden', () => {
    expect(hidden('This is hidden')).toBe('[//]: # (This is hidden)')
  })
})
