import {
	createBrotliDecompress,
	createGunzip,
	createInflate,
	BrotliDecompress,
	Gunzip,
	Inflate,
} from 'zlib'
import { get, IncomingMessage } from 'http'
import { stringify } from 'querystring'
import { Readable } from 'stream'

const pipe = {
	br: createBrotliDecompress,
	gzip: createGunzip,
	deflate: createInflate,
} as { [key: string]: () => BrotliDecompress | Gunzip | Inflate }

const decompress = (response: IncomingMessage): Readable => {
	const contentEncoding = response.headers['content-encoding'] || ''

	const method = pipe[contentEncoding] || null
	return method ? response.pipe(method()) : response
}

const body = (response: Readable) =>
	new Promise<string>((ok, err) => {
		response.setEncoding('utf8')

		let buf = ''
		response.on('data', chunk => (buf += chunk))
		response.on('end', () => ok(buf))
		response.on('error', e => err(e))
	})

const firefox =
	'Mozilla/5.0 (X11; Linux x86_64; rv:67.0) Gecko/20100101 Firefox/67.0'

export const request = (url: string, query?: { [key: string]: string }) =>
	new Promise<string>((ok, err) =>
		get(
			url + (query ? '?' + stringify(query) : ''),
			{
				headers: {
					'User-Agent': firefox,
					'Accept-Encoding': Object.keys(pipe).join(', '),
				},
			},
			res => ok(body(decompress(res))),
		).on('error', e => err(e)),
	)
