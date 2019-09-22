import { get } from 'http'
import { stringify } from 'querystring'

const firefox =
	'Mozilla/5.0 (X11; Linux x86_64; rv:67.0) Gecko/20100101 Firefox/67.0'

export const request = (url: string, query?: { [key: string]: string }) =>
	new Promise<string>((ok, err) =>
		get(
			url + (query ? '?' + stringify(query) : ''),
			{ headers: { 'User-Agent': firefox } },
			res => {
				res.setEncoding('utf8')
				let data: string = ''
				res.on('data', ch => (data += ch))
				res.on('end', () => ok(data))
			},
		).on('error', e => err(e)),
	)
