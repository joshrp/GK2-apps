/**
 * Icon URLs by file stem (`icons/<stem>.png`). Vite copies each PNG into the build as its own
 * file (`?no-inline`: every icon is under the 4 KB inline limit, and inlining 854 of them would
 * put 3.4 MB of base64 into the page script). The URLs respect `base`.
 */
const urls = import.meta.glob<string>('../../../data_export/icons/*.png', {
	eager: true,
	query: '?no-inline',
	import: 'default'
});

const byStem = new Map(
	Object.entries(urls).map(([path, url]) => [
		path.slice(path.lastIndexOf('/') + 1, -'.png'.length),
		url
	])
);

/** URL of an icon, or undefined when there's no stem or no such file. */
export function iconUrl(stem: string | null): string | undefined {
	return stem === null ? undefined : byStem.get(stem);
}
