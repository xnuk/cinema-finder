import { Theater, getTheaters, Schedule } from './theaters.ts'
import { request } from './http.ts'
import { search } from './search.ts'

import { readFile, writeFile } from 'node:fs/promises'

const cachePath = process.env['CACHE_JSON'] || './___cache.json'

const prettyPrint = (
	{ name, city, area }: Theater,
	schedules: Schedule[],
): string => {
	const foo = schedules
		.map(({ screen, movie, timetable }) => {
			const tt = timetable
				.map(t => t.replace(/([0-9]{2})$/, ':$1'))
				.join(' ')
			return `${movie} (${screen}): ${tt}`
		})
		.join('\n')
	return [city, area, name].join(' ') + '\n' + foo
}

const main = async () => {
	const [query, movieName, yyyymmdd] = process.argv.slice(2)
	if (!query || !movieName) {
		console.error(
			`사용법: ${
				process.argv[1] || 'cinema-finder'
			} [지역] [영화명] [날짜 (yyyymmdd, 생략가능)]`,
		)
		return process.exit(1)
	}

	let f
	try {
		f = JSON.parse(await readFile(cachePath, 'utf8'))
	} catch (_) {
		f = await getTheaters(request)()
		writeFile(cachePath, JSON.stringify(f), 'utf8')
	}

	debugger

	const inst = search((...params: Parameters<typeof request>) =>
		request(...params).then(body => JSON.parse(body)),
	)(f)

	console.log(
		(await inst(query, movieName, yyyymmdd))
			.map(({ theater, schedule }) => prettyPrint(theater, schedule))
			.join('\n\n'),
	)
}

main()
