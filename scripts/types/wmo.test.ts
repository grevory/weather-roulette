import { wmoCodeToSkyCondition } from './wmo'

describe('wmoCodeToSkyCondition', () => {
  it('maps code 0 to clear', () => {
    expect(wmoCodeToSkyCondition(0)).toBe('clear')
  })
  it('maps code 1 to partly-cloudy', () => {
    expect(wmoCodeToSkyCondition(1)).toBe('partly-cloudy')
  })
  it('maps code 3 to overcast', () => {
    expect(wmoCodeToSkyCondition(3)).toBe('overcast')
  })
  it('maps code 61 to rain', () => {
    expect(wmoCodeToSkyCondition(61)).toBe('rain')
  })
  it('maps code 71 to snow', () => {
    expect(wmoCodeToSkyCondition(71)).toBe('snow')
  })
  it('throws on unknown code', () => {
    expect(() => wmoCodeToSkyCondition(999)).toThrow('Unknown WMO code: 999')
  })
})
