import { Theater, getTheaters, Schedule } from './theaters'
import { request } from './http'
import { search } from './search'

import { promises as fs } from 'fs'

const cachePath = process.env.CACHE_JSON || './___cache.json'

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

if (require.main === module)
	(async () => {
		let f
		try {
			f = JSON.parse(await fs.readFile(cachePath, 'utf8'))
		} catch (_) {
			f = await getTheaters(request)()
			fs.writeFile(cachePath, JSON.stringify(f), 'utf8')
		}

		const inst = search((...params: Parameters<typeof request>) =>
			request(...params).then(body => JSON.parse(body)),
		)(f)
		console.log(
			(await inst(process.argv[2], process.argv[3], process.argv[4]))
				.map(({ theater, schedule }) => prettyPrint(theater, schedule))
				.join('\n\n'),
		)
	})()
