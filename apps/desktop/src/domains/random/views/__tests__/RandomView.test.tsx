import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RandomView from '../RandomView';
import { RANDOM_NOTE_MAX_COUNT } from '@/domains/random/hooks/useRandomNote';

const mockSaveNote = jest.fn();
const mockAddNote = jest.fn();
const mockDeleteNote = jest.fn();
let mockRandomState = {
	notes: [{ id: 'main', content: '# Legacy note' }],
	loading: false,
	saveNote: mockSaveNote,
	addNote: mockAddNote,
	deleteNote: mockDeleteNote,
};

jest.mock('@/domains/random/hooks/useRandomNote', () => ({
	RANDOM_NOTE_LIMIT: 10_000,
	RANDOM_NOTE_MAX_COUNT: 5,
	useRandomNote: () => mockRandomState,
}));

jest.mock('react-markdown', () => ({
	__esModule: true,
	default: ({ children }: { children: string }) => {
		const text = String(children);
		return (
			<div data-testid="markdown-preview">
				{text.includes('# ') && <h1>{text.replace(/^#\s*/, '')}</h1>}
				{text.includes('- ') && (
					<ul>
						<li>item</li>
					</ul>
				)}
				{text.includes('`') && <p><code>code</code></p>}
				{text.includes('|') && (
					<table>
						<thead><tr><th>Column</th></tr></thead>
						<tbody><tr><td>Value</td></tr></tbody>
					</table>
				)}
			</div>
		);
	},
}));

jest.mock('remark-gfm', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('RandomView', () => {
	beforeEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
		mockRandomState = {
			notes: [{ id: 'main', content: '# Legacy note' }],
			loading: false,
			saveNote: mockSaveNote,
			addNote: mockAddNote,
			deleteNote: mockDeleteNote,
		};
	});

	it('renders legacy main note content and autosaves selected note edits', async () => {
		jest.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
		render(<RandomView />);

		const editor = screen.getByLabelText('Random note editor');
		expect(editor).toHaveValue('# Legacy note');

		await user.clear(editor);
		await user.type(editor, 'Updated note');
		await act(async () => {
			jest.advanceTimersByTime(900);
		});

		await waitFor(() => expect(mockSaveNote).toHaveBeenCalledWith('main', 'Updated note'));
	});

	it('switches between editor and markdown preview', async () => {
		const user = userEvent.setup();
		render(<RandomView />);

		await user.click(screen.getByRole('button', { name: /markdown/i }));

		expect(screen.queryByLabelText('Random note editor')).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /legacy note/i })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /^editor$/i }));
		expect(screen.getByLabelText('Random note editor')).toBeInTheDocument();
	});

	it('opens the focused editor dialog and saves note edits', async () => {
		const user = userEvent.setup();
		render(<RandomView />);

		await user.click(screen.getByRole('button', { name: /open editor/i }));

		const dialog = screen.getByRole('dialog');
		const dialogEditor = within(dialog).getByLabelText('Random note dialog editor');
		expect(dialogEditor).toHaveValue('# Legacy note');

		await user.clear(dialogEditor);
		await user.type(dialogEditor, 'Focused note');
		await user.click(within(dialog).getByRole('button', { name: /^save$/i }));

		await waitFor(() => expect(mockSaveNote).toHaveBeenCalledWith('main', 'Focused note'));
	});

	it('renders markdown preview with document element styles', async () => {
		const user = userEvent.setup();
		mockRandomState = {
			...mockRandomState,
			notes: [{ id: 'main', content: '# Heading\n\n- item\n\n`code`\n\n| Column |\n| --- |\n| Value |' }],
		};
		render(<RandomView />);

		await user.click(screen.getByRole('button', { name: /markdown/i }));

		expect(screen.getByTestId('markdown-preview').parentElement).toHaveClass('markdown-preview');
		expect(screen.getByRole('heading', { name: /heading/i })).toBeInTheDocument();
		expect(screen.getByRole('list')).toBeInTheDocument();
		expect(screen.getByText('code')).toBeInTheDocument();
		expect(screen.getByRole('table')).toBeInTheDocument();
	});

	it('adds up to five notes and disables add at the cap', async () => {
		const user = userEvent.setup();
		mockRandomState = {
			...mockRandomState,
			notes: Array.from({ length: RANDOM_NOTE_MAX_COUNT }, (_, index) => ({
				id: index === 0 ? 'main' : `note-${index}`,
				content: `Note ${index + 1}`,
			})),
		};
		const { rerender } = render(<RandomView />);

		expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
		expect(screen.getByText('5/5 notes')).toBeInTheDocument();

		mockRandomState = {
			...mockRandomState,
			notes: [{ id: 'main', content: 'Only note' }],
		};
		rerender(<RandomView />);
		mockAddNote.mockResolvedValue('new-note');
		await user.click(screen.getByRole('button', { name: /add/i }));

		expect(mockAddNote).toHaveBeenCalledTimes(1);
	});

	it('deletes the selected note', async () => {
		const user = userEvent.setup();
		render(<RandomView />);

		await user.click(screen.getByRole('button', { name: /delete note/i }));

		expect(mockDeleteNote).toHaveBeenCalledWith('main');
	});
});
