import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaperCard from '../PaperCard.jsx';

const basePaper = {
  id: 'paper-1',
  title: 'Sample Paper Title',
  url: 'https://example.com/paper',
  authors_text: 'Doe, J.; Smith, A.',
  year: 2024,
  venue: 'Test Conference',
  cited_by_count: 10,
  references_count: 5,
  abstract: 'A short abstract.',
  concepts: ['AI', 'ML'],
};

describe('PaperCard', () => {
  test('renders title with link and meta information', () => {
    render(<PaperCard paper={basePaper} />);

    const titleLink = screen.getByRole('link', { name: /Sample Paper Title/i });
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', basePaper.url);

    expect(screen.getByText(/Doe, J.; Smith, A\./i)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Test Conference/i)).toBeInTheDocument();

    expect(screen.getByText(/10 citations/)).toBeInTheDocument();
    expect(screen.getByText(/5 references/)).toBeInTheDocument();
  });

  test('shows similarity badge when per_abstract_sims are provided and hideSimilarity is false', () => {
    const paper = {
      ...basePaper,
      per_abstract_sims: [0.8, 0.9],
    };

    render(<PaperCard paper={paper} />);

    const badge = screen.getByText(/Similarity:/i);
    expect(badge).toBeInTheDocument();
  });

  test('hides similarity badge when hideSimilarity is true', () => {
    const paper = {
      ...basePaper,
      per_abstract_sims: [0.8, 0.9],
    };

    render(<PaperCard paper={paper} hideSimilarity />);

    expect(screen.queryByText(/Similarity:/i)).toBeNull();
  });

  test('shows open access badge when is_open_access is true', () => {
    const paper = {
      ...basePaper,
      is_open_access: true,
      oa_url: 'https://example.com/open-access',
    };

    render(<PaperCard paper={paper} />);

    const oaLink = screen.getByRole('link', { name: /Open Access/i });
    expect(oaLink).toBeInTheDocument();
    expect(oaLink).toHaveAttribute('href', paper.oa_url);
  });

  test('truncates long abstract and toggles with Show more / Show less', async () => {
    const longAbstract = 'A'.repeat(300);
    const paper = {
      ...basePaper,
      abstract: longAbstract,
    };

    render(<PaperCard paper={paper} />);

    const text = screen.getByText(/A{10}/); // any part of the abstract
    expect(text.textContent.length).toBeLessThan(longAbstract.length);
    expect(screen.getByRole('button', { name: /Show more/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Show more/i }));
    expect(screen.getByRole('button', { name: /Show less/i })).toBeInTheDocument();
  });
});
