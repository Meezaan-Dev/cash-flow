import type React from 'react';

export const createSelectMock = (ReactModule: typeof import('react')) => {
	type SelectContextValue = {
		value?: string;
		onValueChange?: (value: string) => void;
		open: boolean;
		setOpen: (open: boolean) => void;
	};

	const SelectContext = ReactModule.createContext<SelectContextValue | null>(null);
	const useSelectContext = () => {
		const context = ReactModule.useContext(SelectContext);
		if (!context) throw new Error('Select mock components must be rendered inside Select');
		return context;
	};

	const Select = ({
		value,
		onValueChange,
		children,
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		children: React.ReactNode;
	}) => {
		const [open, setOpen] = ReactModule.useState(false);
		return (
			<SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
				{children}
			</SelectContext.Provider>
		);
	};

	const SelectTrigger = ReactModule.forwardRef<
		HTMLButtonElement,
		React.ButtonHTMLAttributes<HTMLButtonElement>
	>(({ children, onClick, ...props }, ref) => {
		const context = useSelectContext();
		return (
			<button
				{...props}
				ref={ref}
				type="button"
				role="combobox"
				aria-expanded={context.open}
				onClick={(event) => {
					context.setOpen(!context.open);
					onClick?.(event);
				}}
			>
				{children}
			</button>
		);
	});
	SelectTrigger.displayName = 'SelectTrigger';

	const SelectContent = ({ children }: { children: React.ReactNode }) => {
		const context = useSelectContext();
		return context.open ? <div role="listbox">{children}</div> : null;
	};

	const SelectItem = ({
		value,
		children,
	}: {
		value: string;
		children: React.ReactNode;
	}) => {
		const context = useSelectContext();
		return (
			<button
				type="button"
				role="option"
				aria-selected={context.value === value}
				onClick={() => {
					context.onValueChange?.(value);
					context.setOpen(false);
				}}
			>
				{children}
			</button>
		);
	};

	const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;

	return {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue,
	};
};
