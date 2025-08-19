export type SortOrder = "asc" | "desc";

export function generateSort(
	sortField?: string,
	sortOrder?: SortOrder,
): string | undefined {
	return sortField
		? sortOrder === "asc"
			? sortField
			: `-${sortField}`
		: undefined;
}
