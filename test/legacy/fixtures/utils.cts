export function dashify(str: string): string {
	return str.replace(/([a-zA-Z])(?=[A-Z\d])/g, '$1-').toLowerCase();
}
