import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiEdit3, FiSave } from 'react-icons/fi';
import { Button } from '@/components/app/ui/button';
import { Textarea } from '@/components/app/ui/textarea';
import { useToast } from '@/components/app/ui/use-toast';
import { PageHeader, PageShell } from '@/components/app/page-layout';
import { useRandomNote, RANDOM_NOTE_LIMIT } from '@/domains/random/hooks/useRandomNote';
import { cardSurface, sectionLabel } from '@/styles/marketingStyles';
import { cn } from '@/lib/utils';
import { getAppErrorMessage } from '@cash-flow/shared/errors';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const RandomView: React.FC = () => {
	const { content, loading, saveNote } = useRandomNote();
	const { toast } = useToast();
	const [draft, setDraft] = useState('');
	const [savedContent, setSavedContent] = useState('');
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
	const [hasLocalChanges, setHasLocalChanges] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const latestDraftRef = useRef('');

	useEffect(() => {
		setSavedContent(content);
		if (!hasLocalChanges) setDraft(content);
	}, [content, hasLocalChanges]);

	useEffect(() => {
		latestDraftRef.current = draft;
	}, [draft]);

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const persistDraft = async (nextContent = draft) => {
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
			await saveNote(nextContent);
			setSavedContent(nextContent);
			if (latestDraftRef.current === nextContent) {
				setHasLocalChanges(false);
				setSaveStatus('saved');
			} else {
				setHasLocalChanges(true);
				setSaveStatus('idle');
			}
		} catch (error) {
			setSaveStatus('error');
			toast({
				title: 'Random note was not saved',
				description: getAppErrorMessage(error, { operation: 'Save random note' }),
				variant: 'destructive',
			});
		}
	};

	useEffect(() => {
		if (loading || !hasLocalChanges || draft === savedContent) return;

		const timeoutId = window.setTimeout(() => {
			void persistDraft(draft);
		}, 900);

		return () => window.clearTimeout(timeoutId);
		// persistDraft intentionally stays out of this dependency list so typing only
		// resets the debounce when the actual text/save inputs change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draft, hasLocalChanges, loading, saveNote, savedContent]);

	const remainingCharacters = RANDOM_NOTE_LIMIT - draft.length;
	const saveLabel =
		saveStatus === 'saving'
			? 'Saving...'
			: saveStatus === 'saved' && !hasLocalChanges
				? 'Saved'
				: hasLocalChanges
					? 'Unsaved changes'
					: 'Ready';

	return (
		<PageShell className="flex flex-col">
			<PageHeader
				badge="Random"
				title="Write anything down"
				subtitle="A private place for brain dumps, reminders, rough thoughts, or anything that helps with mental clarity."
			/>

			<section className={cn('flex min-h-[60vh] flex-1 flex-col overflow-hidden', cardSurface)}>
				<header className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
					<div>
						<p className={sectionLabel}>Free text</p>
						<h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
							<FiEdit3 className="h-5 w-5 text-blue-600" />
							Random notes
						</h2>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
							{saveStatus === 'saved' && !hasLocalChanges && <FiCheck className="h-4 w-4 text-emerald-600" />}
							{saveLabel}
						</span>
						<Button
							type="button"
							variant="marketing"
							onClick={() => void persistDraft()}
							disabled={loading || saveStatus === 'saving' || draft.length > RANDOM_NOTE_LIMIT}
						>
							<FiSave className="mr-2 h-4 w-4" />
							Save
						</Button>
					</div>
				</header>

				<div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
					<Textarea
						ref={textareaRef}
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value);
							setHasLocalChanges(true);
							setSaveStatus('idle');
						}}
						disabled={loading}
						placeholder="Write whatever is on your mind..."
						className="min-h-[420px] flex-1 resize-none border-gray-200 bg-white/80 text-base leading-7 shadow-inner dark:border-gray-800 dark:bg-gray-950/50"
						aria-label="Random free text note"
					/>
					<div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
						<p>{loading ? 'Loading your note...' : 'Autosaves after you pause typing.'}</p>
						<p className={remainingCharacters < 0 ? 'text-destructive' : undefined}>
							{remainingCharacters.toLocaleString()} characters remaining
						</p>
					</div>
				</div>
			</section>
		</PageShell>
	);
};

export default RandomView;
