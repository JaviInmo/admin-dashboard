export function shouldShowPage(
	page: number,
	currentPage: number,
	totalPages: number,
): boolean {
	const min = Math.max(1, currentPage - 2);
	const max = Math.min(totalPages, currentPage + 1);

	const shouldShow =
		(page >= min && page <= max) ||
		(page <= min && currentPage - page < 2) ||
		currentPage - page === 2;

	return shouldShow;
}
