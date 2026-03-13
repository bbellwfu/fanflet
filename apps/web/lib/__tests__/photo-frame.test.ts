import { describe, it, expect } from 'vitest'
import {
  clampPhotoFrame,
  readPhotoFrame,
  getFramedImageStyle,
  getPhotoFrameImageStyle,
  type PhotoFrame,
} from '../photo-frame'

describe('clampPhotoFrame', () => {
  it('clamps zoom to range [1, 3]', () => {
    expect(clampPhotoFrame({ zoom: 0.5, offsetX: 0, offsetY: 0 }).zoom).toBe(1)
    expect(clampPhotoFrame({ zoom: 5, offsetX: 0, offsetY: 0 }).zoom).toBe(3)
    expect(clampPhotoFrame({ zoom: 2, offsetX: 0, offsetY: 0 }).zoom).toBe(2)
  })

  it('clamps offsetX to range [-1, 1]', () => {
    expect(clampPhotoFrame({ zoom: 1, offsetX: -2, offsetY: 0 }).offsetX).toBe(-1)
    expect(clampPhotoFrame({ zoom: 1, offsetX: 2, offsetY: 0 }).offsetX).toBe(1)
    expect(clampPhotoFrame({ zoom: 1, offsetX: 0.5, offsetY: 0 }).offsetX).toBe(0.5)
  })

  it('clamps offsetY to range [-1, 1]', () => {
    expect(clampPhotoFrame({ zoom: 1, offsetY: -2, offsetX: 0 }).offsetY).toBe(-1)
    expect(clampPhotoFrame({ zoom: 1, offsetY: 2, offsetX: 0 }).offsetY).toBe(1)
  })

  it('passes through valid values unchanged', () => {
    const frame: PhotoFrame = { zoom: 1.5, offsetX: 0.3, offsetY: -0.7 }
    expect(clampPhotoFrame(frame)).toEqual(frame)
  })
})

describe('readPhotoFrame', () => {
  it('returns null for non-object input', () => {
    expect(readPhotoFrame(null)).toBeNull()
    expect(readPhotoFrame(undefined)).toBeNull()
    expect(readPhotoFrame('string')).toBeNull()
    expect(readPhotoFrame(42)).toBeNull()
  })

  it('returns null when photo_frame key is missing', () => {
    expect(readPhotoFrame({})).toBeNull()
    expect(readPhotoFrame({ other: 'data' })).toBeNull()
  })

  it('returns null when photo_frame is not an object', () => {
    expect(readPhotoFrame({ photo_frame: 'string' })).toBeNull()
    expect(readPhotoFrame({ photo_frame: 42 })).toBeNull()
  })

  it('reads valid photo frame with defaults for missing fields', () => {
    const result = readPhotoFrame({ photo_frame: {} })
    expect(result).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 })
  })

  it('reads and clamps photo frame values', () => {
    const result = readPhotoFrame({
      photo_frame: { zoom: 5, offsetX: -3, offsetY: 2 },
    })
    expect(result).toEqual({ zoom: 3, offsetX: -1, offsetY: 1 })
  })

  it('reads valid numeric values', () => {
    const result = readPhotoFrame({
      photo_frame: { zoom: 2, offsetX: 0.5, offsetY: -0.3 },
    })
    expect(result).toEqual({ zoom: 2, offsetX: 0.5, offsetY: -0.3 })
  })

  it('defaults non-numeric values to defaults', () => {
    const result = readPhotoFrame({
      photo_frame: { zoom: 'big', offsetX: null, offsetY: undefined },
    })
    expect(result).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 })
  })
})

describe('getFramedImageStyle', () => {
  it('computes style for square image (aspect=1) at zoom=1', () => {
    const style = getFramedImageStyle({ zoom: 1, offsetX: 0, offsetY: 0 }, 80, 1)
    expect(style.width).toBe(80)
    expect(style.height).toBe(80)
    expect(style.left).toBe(0)
    expect(style.top).toBe(0)
    expect(style.position).toBe('absolute')
  })

  it('computes style for landscape image (aspect=2)', () => {
    const style = getFramedImageStyle({ zoom: 1, offsetX: 0, offsetY: 0 }, 80, 2)
    expect(style.width).toBe(160)
    expect(style.height).toBe(80)
    expect(style.left).toBe(-40) // (80 - 160) / 2
  })

  it('computes style for portrait image (aspect=0.5)', () => {
    const style = getFramedImageStyle({ zoom: 1, offsetX: 0, offsetY: 0 }, 80, 0.5)
    expect(style.width).toBe(80)
    expect(style.height).toBe(160)
    expect(style.top).toBe(-40) // (80 - 160) / 2
  })

  it('applies zoom scaling', () => {
    const style = getFramedImageStyle({ zoom: 2, offsetX: 0, offsetY: 0 }, 80, 1)
    expect(style.width).toBe(160) // 80 * 2
    expect(style.height).toBe(160)
  })

  it('applies offset', () => {
    const style = getFramedImageStyle({ zoom: 1, offsetX: 0.5, offsetY: -0.5 }, 80, 1)
    expect(style.left).toBe(-40) // (80-80)/2 - 0.5*80
    expect(style.top).toBe(40) // (80-80)/2 - (-0.5)*80
  })

  it('clamps out-of-range values before computing', () => {
    const style = getFramedImageStyle({ zoom: 10, offsetX: 5, offsetY: 5 }, 80, 1)
    // zoom clamped to 3, offsets clamped to 1
    expect(style.width).toBe(240) // 80 * 3
    expect(style.height).toBe(240)
  })
})

describe('getPhotoFrameImageStyle', () => {
  it('returns undefined for null', () => {
    expect(getPhotoFrameImageStyle(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(getPhotoFrameImageStyle(undefined)).toBeUndefined()
  })

  it('returns transform style for valid frame', () => {
    const style = getPhotoFrameImageStyle({ zoom: 1, offsetX: 0, offsetY: 0 })
    expect(style).toBeDefined()
    expect(style!.transform).toContain('scale(1)')
    expect(style!.transformOrigin).toBe('center')
  })

  it('computes correct transform with offsets', () => {
    const style = getPhotoFrameImageStyle({ zoom: 2, offsetX: 0.5, offsetY: -0.3 })
    expect(style).toBeDefined()
    expect(style!.transform).toContain('scale(2)')
  })
})
