import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import * as api from '../../services/api';
import Home from '../Home.jsx';

vi.mock('../../services/api', () => ({
  searchPapersPOST: vi.fn().mockResolvedValue({ results: [], count: 0 }),
  searchOpenAlexKeywordPOST: vi.fn().mockResolvedValue({ results: [], count: 0 }),
}));

function renderWithRouter(ui) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Home page', () => {
  test('renders the main heading', () => {
    renderWithRouter(<Home />);
    expect(
      screen.getByText(/Discover the Most Relevant/i)
    ).toBeInTheDocument();
  });

  test('shows keywords input field', () => {
    renderWithRouter(<Home />);
    const input = screen.getByPlaceholderText(/Type keywords and press Enter/i);
    expect(input).toBeInTheDocument();
  });

  test('shows at least one abstract textarea', () => {
    renderWithRouter(<Home />);
    const textarea = screen.getByPlaceholderText(/Paste your research abstract here/i);
    expect(textarea).toBeInTheDocument();
  });

  test('prevents search and shows alert when no inputs provided', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithRouter(<Home />);

    const searchButton = screen.getByRole('button', {
      name: /Search Research Papers/i,
    });

    await userEvent.click(searchButton);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(api.searchPapersPOST).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  test('shows validation error and disables search when year range is invalid', async () => {
    renderWithRouter(<Home />);

    const minInput = screen.getByPlaceholderText(/min/i);
    const maxInput = screen.getByPlaceholderText(/max/i);

    await userEvent.clear(minInput);
    await userEvent.type(minInput, '2025');
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, '2000');

    await screen.findByText(/Min year cannot be greater than max year/i);

    const searchButton = screen.getByRole('button', {
      name: /Search Research Papers/i,
    });

    expect(searchButton).toBeDisabled();
  });

  test('calls search API with normalized payload when keyword and year range are provided', async () => {
    api.searchPapersPOST.mockResolvedValueOnce({ results: [], count: 0 });

    renderWithRouter(<Home />);

    const keywordInput = screen.getByPlaceholderText(/Type keywords and press Enter/i);
    await userEvent.type(keywordInput, 'AI{enter}');

    const minInput = screen.getByPlaceholderText(/min/i);
    const maxInput = screen.getByPlaceholderText(/max/i);
    await userEvent.clear(minInput);
    await userEvent.type(minInput, '2000');
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, '2020');

    const searchButton = screen.getByRole('button', {
      name: /Search Research Papers/i,
    });

    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(api.searchPapersPOST).toHaveBeenCalledTimes(1);
    });

    const callArg = api.searchPapersPOST.mock.calls[0][0];

    expect(callArg.keywords).toEqual(['AI']);
    expect(callArg.abstracts).toEqual([]);
    expect(callArg.year_min).toBe(2000);
    expect(callArg.year_max).toBe(2020);
    expect(callArg.page).toBe(1);
    expect(callArg.per_page).toBe(30);
  });

  test('shows inline error message when search API fails', async () => {
    api.searchPapersPOST.mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<Home />);

    const keywordInput = screen.getByPlaceholderText(/Type keywords and press Enter/i);
    await userEvent.type(keywordInput, 'AI{enter}');

    const searchButton = screen.getByRole('button', {
      name: /Search Research Papers/i,
    });

    await userEvent.click(searchButton);

    await screen.findByText(/Search failed\. Please try again\./i);
  });
});
