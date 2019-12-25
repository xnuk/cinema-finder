type HTTPGetRequest<T> = (
	url: string,
	query?: { [key: string]: string },
) => Promise<T>

export type HTTPGetRequestText = HTTPGetRequest<string>
export type HTTPGetRequestJson<T = { [key: string]: any }> = HTTPGetRequest<T>
