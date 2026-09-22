import type { ExportFile } from '@/shared/export/appDataExport';

export const downloadExportFiles = (files: ExportFile[]) => {
	files.forEach((file) => {
		const blob = new Blob([file.content], { type: file.mimeType });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = file.filename;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	});
};
