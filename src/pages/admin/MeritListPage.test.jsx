import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeritListPage } from './MeritListPage.jsx';
import { resultService } from '../../services/resultService.js';
import { downloadCSV } from '../../lib/csvExport.js';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../../lib/csvExport.js', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadCSV: vi.fn(),
}));

const merit = [
  { id: 'r1', candidateId: 'c1', candidateName: 'Top Candidate', candidateEmail: 'top@x.com', percentage: 90, totalScore: 45, timeTaken: 600, eligibility: 'ELIGIBLE', rank: 1 },
  { id: 'r2', candidateId: 'c2', candidateName: 'Middle Candidate', candidateEmail: 'mid@x.com', percentage: 60, totalScore: 30, timeTaken: 900, eligibility: 'CONDITIONALLY_ELIGIBLE', rank: 2 },
  { id: 'r3', candidateId: 'c3', candidateName: 'Bottom Candidate', candidateEmail: 'low@x.com', percentage: 20, totalScore: 10, timeTaken: 1200, eligibility: 'NOT_ELIGIBLE', rank: 3 },
];

const renderPage = async () => {
  render(<MeritListPage />);
  await screen.findByText('Top Candidate');
};

const filterSelect = () => screen.getByLabelText('Filter by eligibility');
const rankCell = (name) =>
  screen.getByText(name).closest('tr').querySelector('td').textContent.trim();

describe('MeritListPage eligibility filter', () => {
  beforeEach(() => {
    vi.spyOn(resultService, 'getMeritList').mockResolvedValue(structuredClone(merit));
    vi.clearAllMocks();
  });

  it('hides NOT_ELIGIBLE rows by default', async () => {
    await renderPage();
    expect(screen.queryByText('Bottom Candidate')).not.toBeInTheDocument();
    expect(screen.getByText('Middle Candidate')).toBeInTheDocument();
    expect(screen.getByText(/eligible and conditionally eligible/i)).toBeInTheDocument();
  });

  it('shows every row for "all" and keeps their ranks', async () => {
    await renderPage();
    fireEvent.change(filterSelect(), { target: { value: 'all' } });

    expect(screen.getByText('Bottom Candidate')).toBeInTheDocument();
    expect(rankCell('Top Candidate')).toBe('1');
    expect(rankCell('Middle Candidate')).toBe('2');
    expect(rankCell('Bottom Candidate')).toBe('3');
  });

  it('shows only the selected single eligibility', async () => {
    await renderPage();
    fireEvent.change(filterSelect(), { target: { value: 'NOT_ELIGIBLE' } });

    expect(screen.getByText('Bottom Candidate')).toBeInTheDocument();
    expect(screen.queryByText('Top Candidate')).not.toBeInTheDocument();
    expect(screen.queryByText('Middle Candidate')).not.toBeInTheDocument();
    expect(rankCell('Bottom Candidate')).toBe('3');
  });

  it('shows an empty state when no row matches the filter', async () => {
    vi.spyOn(resultService, 'getMeritList').mockResolvedValue([merit[0]]);
    render(<MeritListPage />);
    await screen.findByText('Top Candidate');
    fireEvent.change(filterSelect(), { target: { value: 'NOT_ELIGIBLE' } });

    expect(screen.getByText(/no candidates match/i)).toBeInTheDocument();
  });

  it('exports exactly the visible rows', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(downloadCSV).toHaveBeenCalledTimes(1);
    const [, csv] = downloadCSV.mock.calls[0];
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3); // header + 2 eligible/conditional rows
    expect(csv).toContain('Top Candidate');
    expect(csv).toContain('Middle Candidate');
    expect(csv).not.toContain('Bottom Candidate');

    fireEvent.change(filterSelect(), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    const [, allCsv] = downloadCSV.mock.calls[1];
    expect(allCsv.trim().split('\r\n')).toHaveLength(4);
    expect(allCsv).toContain('Bottom Candidate');
  });
});
