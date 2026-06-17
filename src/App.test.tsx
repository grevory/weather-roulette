import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  } as Response)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the app heading', async () => {
    render(<App />)
    // heading is present immediately; await async state to avoid act() warnings
    await waitFor(() =>
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Weather Roulatte')
  })

  it('shows collecting message when scores are empty', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
    )
    expect(screen.getByText(/No scored days yet/)).toBeInTheDocument()
  })
})
