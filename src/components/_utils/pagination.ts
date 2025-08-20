export function shouldShowPage(
	page: number,
	currentPage: number,
	totalPages: number,
): boolean {
	// Mostrar 5 páginas con la página actual SIEMPRE en el centro
	const maxVisible = 5;
	const halfVisible = Math.floor(maxVisible / 2); // 2
	
	// Calcular el rango ideal centrado en la página actual
	let start = currentPage - halfVisible; // currentPage - 2
	let end = currentPage + halfVisible;   // currentPage + 2
	
	// Ajustar si nos salimos de los límites
	if (start < 1) {
		// Si empezamos antes de la página 1, ajustar hacia la derecha
		const offset = 1 - start;
		start = 1;
		end = Math.min(totalPages, end + offset);
	} else if (end > totalPages) {
		// Si terminamos después de la última página, ajustar hacia la izquierda
		const offset = end - totalPages;
		end = totalPages;
		start = Math.max(1, start - offset);
	}
	
	return page >= start && page <= end;
}
