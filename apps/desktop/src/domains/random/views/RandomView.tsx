import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiCheck, FiEdit3, FiFileText, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/app/ui/button';
import { Textarea } from '@/components/app/ui/textarea';
import { useToast } from '@/components/app/ui/use-toast';
import { PageHeader, PageShell } from '@/components/app/page-layout';
import {
	RANDOM_NOTE_LIMIT,
	RANDOM_NOTE_MAX_COUNT,
	useRandomNote,
} from '@/domains/random/hooks/useRandomNote';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { getAppErrorMessage } from '@cash-flow/shared/errors';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ViewMode = 'editor' | 'markdown';

const RandomView: React.FC = () => {
	const { notes, loading, saveNote, addNote, deleteNote } = useRandomNote();
	const { toast } = useToast();
	const [activeNoteId, setActiveNoteId] = useState('');
	const [note, setNote] = useState({ draft: '', saved: '' });
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
	const [viewMode, setViewMode] = useState<ViewMode>('editor');
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const { draft, saved } = note;
	const hasLocalChanges = draft !== saved;
	const activeNote = useMemo(() => notes.find((item) => item.id === activeNoteId) ?? notes[0], [activeNoteId, notes]);

	useEffect(() => {
		if (!activeNote) {
			setActiveNoteId('');
			setNote({ draft: '', saved: '' });
			return;
		}

		setActiveNoteId(activeNote.id);
		setNote((current) => ({
			draft:
				current.draft === current.saved || activeNote.id !== activeNoteId
					? activeNote.content
					: current.draft,
			saved: activeNote.content,
		}));
	}, [activeNote, activeNoteId]);

	useEffect(() => {
		if (viewMode === 'editor') textareaRef.current?.focus();
	}, [activeNoteId, viewMode]);

	const persistDraft = useCallback(
		async (nextContent = draft) => {
			if (!activeNote) return;
			if (nextContent.length > RANDOM_NOTE_LIMIT) {
				setSaveStatus('error');
				toast({
					title: 'Random note is too long',
					description: `Keep it to ${RANDOM_NOTE_LIMIT.toLocaleString()} characters or fewer.`,
					variant: 'destructive',
				});
				return;
			}

			setSaveStatus('saving');
			try {
				await saveNote(activeNote.id, nextContent);
				setNote((current) => ({ ...current, saved: nextContent }));
				setSaveStatus('saved');
			} catch (error) {
				setSaveStatus('error');
				toast({
					title: 'Random note was not saved',
					description: getAppErrorMessage(error, { operation: 'Save random note' }),
					variant: 'destructive',
				});
			}
		},
		[activeNote, draft, saveNote, toast]
	);

	useEffect(() => {
		if (loading || !activeNote || !hasLocalChanges) return;

		const timeoutId = window.setTimeout(() => {
			void persistDraft(draft);
		}, 900);

		return () => window.clearTimeout(timeoutId);
	}, [activeNote, draft, hasLocalChanges, loading, persistDraft]);

	const handleAddNote = async () => {
		try {
			const nextNoteId = await addNote();
			setActiveNoteId(nextNoteId);
			setSaveStatus('idle');
		} catch (error) {
			toast({
				title: 'Random note was not created',
				description: getAppErrorMessage(error, { operation: 'Create random note' }),
				variant: 'destructive',
			});
		}
	};

	const handleDeleteNote = async () => {
		if (!activeNote) return;
		try {
			await deleteNote(activeNote.id);
			const nextNote = notes.find((item) => item.id !== activeNote.id);
			setActiveNoteId(nextNote?.id ?? '');
			setSaveStatus('idle');
		} catch (error) {
			toast({
				title: 'Random note was not deleted',
				description: getAppErrorMessage(error, { operation: 'Delete random note' }),
				variant: 'destructive',
			});
		}
	};

	const remainingCharacters = RANDOM_NOTE_LIMIT - draft.length;
	const saveLabel =
		saveStatus === 'saving'
			? 'Saving...'
			: saveStatus === 'saved' && !hasLocalChanges
				? 'Saved'
				: hasLocalChanges
					? 'Unsaved changes'
					: 'Ready';
	const canAddNote = !loading && notes.length < RANDOM_NOTE_MAX_COUNT;

	return (
		<PageShell className="flex flex-col">
			<PageHeader
				title="Write anything down"
				subtitle="A private place for brain dumps, reminders, rough thoughts, or anything that helps with mental clarity."
			/>

			<section className={cn('overflow-visible', cardSurface)}>
				<header className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className={sectionLabel}>Free text</p>
						<h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
							<FiEdit3 className="h-5 w-5 text-blue-600" />
							Random notes
						</h2>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex rounded-md border border-gray-200 p-1 dark:border-gray-800">
							<Button
								type="button"
								size="sm"
								variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
								onClick={() => setViewMode('editor')}
								aria-pressed={viewMode === 'editor'}
							>
								<FiEdit3 className="h-4 w-4" />
								Editor
							</Button>
							<Button
								type="button"
								size="sm"
								variant={viewMode === 'markdown' ? 'secondary' : 'ghost'}
								onClick={() => setViewMode('markdown')}
								aria-pressed={viewMode === 'markdown'}
							>
								<FiFileText className="h-4 w-4" />
								Markdown
							</Button>
						</div>
						<span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
							{saveStatus === 'saved' && !hasLocalChanges && <FiCheck className="h-4 w-4 text-emerald-600" />}
							{saveLabel}
						</span>
						<Button
							type="button"
							variant="marketing"
							onClick={() => void persistDraft()}
							disabled={!activeNote || loading || saveStatus === 'saving' || draft.length > RANDOM_NOTE_LIMIT}
						>
							<FiSave className="mr-2 h-4 w-4" />
							Save
						</Button>
					</div>
				</header>

				<div className="space-y-4 p-5">
					<div className="space-y-3">
						{activeNote ? (
							viewMode === 'editor' ? (
								<Textarea
									ref={textareaRef}
									value={draft}
									onChange={(event) => {
										setNote((current) => ({ ...current, draft: event.target.value }));
										setSaveStatus('idle');
									}}
									disabled={loading}
									placeholder="Write whatever is on your mind..."
									className="h-[55vh] min-h-[360px] max-h-[620px] resize-none border-gray-200 bg-white/80 text-base leading-7 shadow-inner dark:border-gray-800 dark:bg-gray-950/50"
									aria-label="Random note editor"
								/>
							) : (
								<div className="markdown-preview h-[55vh] min-h-[360px] max-h-[620px] overflow-y-auto rounded-md border border-gray-200 bg-white p-6 text-base leading-7 shadow-inner dark:border-gray-800 dark:bg-gray-950">
									{draft.trim() ? (
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{draft}
										</ReactMarkdown>
									) : (
										<p className="text-sm text-gray-500 dark:text-gray-400">Nothing to preview yet.</p>
									)}
								</div>
							)
						) : (
							<div className="flex h-[55vh] min-h-[360px] max-h-[620px] flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white/60 p-6 text-center dark:border-gray-700 dark:bg-gray-950/40">
								<p className="text-sm font-medium text-gray-700 dark:text-gray-200">No random notes yet</p>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Add a note to start writing.
								</p>
							</div>
						)}
						<div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
							<p>{loading ? 'Loading your notes...' : 'Autosaves after you pause typing.'}</p>
							<p className={remainingCharacters < 0 ? 'text-destructive' : undefined}>
								{remainingCharacters.toLocaleString()} characters remaining
							</p>
						</div>
					</div>

					<div className="border-t border-gray-100 pt-4 dark:border-gray-800">
						<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
							<p className="text-sm font-medium text-gray-700 dark:text-gray-200">
								{notes.length}/{RANDOM_NOTE_MAX_COUNT} notes
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => void handleAddNote()}
									disabled={!canAddNote}
								>
									<FiPlus className="h-4 w-4" />
									Add
								</Button>
								{activeNote && (
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => void handleDeleteNote()}
									>
										<FiTrash2 className="h-4 w-4" />
										Delete note
									</Button>
								)}
							</div>
						</div>
						<div className="flex gap-2 overflow-x-auto pb-1" aria-label="Random notes">
							{notes.map((item, index) => (
								<button
									key={item.id}
									type="button"
									onClick={() => {
										setActiveNoteId(item.id);
										setSaveStatus('idle');
									}}
									className={cn(
										'min-w-[180px] max-w-[240px] rounded-md border px-3 py-2 text-left text-sm transition-colors',
										item.id === activeNote?.id
											? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200'
											: 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900'
									)}
								>
									<span className="block font-medium">Note {index + 1}</span>
									<span className="block truncate text-xs opacity-75">
										{item.content.trim() || 'Empty note'}
									</span>
								</button>
							))}
						</div>
					</div>
				</div>
			</section>
		</PageShell>
	);
};

export default RandomView;
