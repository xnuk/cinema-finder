import { createReadStream, createWriteStream } from 'fs'
import { Transform } from 'stream'

interface ChopBetween {
	readonly from: string
	readonly to: string
	readonly in?: Chop
	readonly repeat?: boolean
}

type Chop = ReadonlyArray<ChopBetween>

const spec: Chop = [
	{
		from: '<thead>',
		to: '</thead>',
		in: [{ from: '<th scope="col"', to: '</th>', repeat: true }],
	},
	{
		from: '<tbody>',
		to: '</tbody>',
		in: [
			{
				from: '<tr>',
				to: '</tr>',
				repeat: true,
				in: [{ from: '<td class="', to: '</td>', repeat: true }],
			},
		],
	},
]

class ChopText extends Transform {
	private parser: Promise<any>
	constructor(
		parser: (
			til: (text: string) => Promise<string>,
			push: (value: string) => void,
		) => Promise<any>,
	) {
		super()
		this.parser = parser(this.til.bind(this), this.push.bind(this))
	}

	private buf: string = ''

	private resolves: { [text: string]: (value?: string) => void } = {}

	private til(text: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.resolves[text] = (value?: string) => {
				if (value == null) reject()
				delete this.resolves[text]
				resolve(value)
			}
			this.tick()
		})
	}

	private tick() {
		const { resolves, buf } = this
		const nextIndex =
			Object.entries(resolves)
				.map(([text, resolve]) => ({
					text,
					resolve,
					index: buf.indexOf(text),
				}))
				.filter(({ index }) => index >= 0)
				.sort(
					(a, b) =>
						a.index - b.index || b.text.length - a.text.length,
				)
				.map(
					({ resolve, index }) => (
						resolve(buf.slice(0, index)), index
					),
				)
				.pop() || 0

		if (nextIndex > 0) {
			this.buf = buf.slice(nextIndex)
		}
	}

	_transform(chunk: string | Buffer, _encoding: string, callback: Function) {
		this.buf += chunk.toString('utf8')
		this.tick()
		callback()
	}

	_final(callback: Function) {
		this.tick()
		Object.values(this.resolves).forEach(resolve => resolve())
		this.parser.then(() => callback())
	}
}

//const chopText = (spec: Chop) => (stream: () => Readable) => {}
console.log(spec)

const scan = (from: string, regex: RegExp): string[] =>
	Array.from(from.matchAll(regex), v => v[1])

const path = process.argv.slice(-1)[0]
createReadStream(path, 'utf8')
	.pipe(
		new ChopText(async ($, push) => {
			await $('<thead>')
			await $('<tr>')
			const columns: string[] = scan(
				await $('</thead>'),
				/<th scope="col"[^>]*>\s*([^>]*)\s*<\/th>/g,
			)
			await $('<tbody>')

			while (await $('<tr>').catch(() => false)) {
				const cols = scan(
					await $('</tr>'),
					/<td class="[^>]*>\s*([^>]*)\s*<\/td>/g,
				).map((v, i) => ({ [columns[i]]: v }))
				push(
					JSON.stringify(
						Object.assign(Object.create(null), ...cols),
					) + '\n',
				)
			}
		}),
	)
	.pipe(createWriteStream('./foo'))
