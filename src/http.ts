const firefox =
	'Mozilla/5.0 (X11; Linux x86_64; rv:67.0) Gecko/20100101 Firefox/67.0'

export const request = (
	url: URL | string,
	query?: { [key: string]: string },
): Promise<string> => {
	const path = new URL(url)
	if (query != null) {
		path.search =
			'?' + new URLSearchParams(Object.entries(query)).toString()
	}
	return fetch(path, {
		headers: { 'user-agent': firefox },
	}).then(v => v.text())
}
