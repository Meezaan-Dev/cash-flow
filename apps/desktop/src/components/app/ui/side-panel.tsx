import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SidePanel = DialogPrimitive.Root;
const SidePanelClose = DialogPrimitive.Close;
const SidePanelTitle = DialogPrimitive.Title;
const SidePanelDescription = DialogPrimitive.Description;

const SidePanelContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				'fixed inset-0 z-50 flex w-full flex-col border-l border-gray-200 bg-white text-gray-900 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-xl',
				className
			)}
			{...props}
		>
			{children}
			<DialogPrimitive.Close className="absolute right-5 top-5 rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50">
				<X className="h-4 w-4" />
				<span className="sr-only">Close</span>
			</DialogPrimitive.Close>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
));
SidePanelContent.displayName = 'SidePanelContent';

export {
	SidePanel,
	SidePanelClose,
	SidePanelContent,
	SidePanelDescription,
	SidePanelTitle,
};
