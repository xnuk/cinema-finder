import { Theater, download } from './theaters'
import { request } from './http'

import { promises as fs } from 'fs'

interface Schedule {
	screen: string
	movie: string
	code: string
	timetable: string[]
}

// const trace = <T>(a: T): T => (console.log(a), a)

const today = () =>
	new Date(Date.now() + new Date(0).setUTCHours(9 - 2))
		.toISOString()
		.replace(/-|T.*$/g, '')

const cachePath = process.env.CACHE_JSON || './___cache.json'

const url = 'http://www.kobis.or.kr/kobis/business/mast/thea/findSchedule.do'

const searchMethod = (from: string, to: string) => {
	if (!from) throw new Error('')

	return from.includes(to)
}

const schedule = async (
	theater: string,
	yyyymmdd: string,
): Promise<Schedule[]> => {
	const data = JSON.parse(
		await request(url, { theaCd: theater, showDt: yyyymmdd }),
	)
	return data.schedule.map(({ scrnNm, movieNm, movieCd, showTm }: any) => ({
		screen: scrnNm,
		movie: movieNm || '',
		code: movieCd,
		timetable: showTm.split(','),
	}))
}

const search = (theater: ReadonlyArray<Theater>) => async (
	query: string,
	movie_name: string,
	yyyymmdd: string = today(),
) => {
	const chunks = query.split(' ')
	const maybe_city = chunks.shift() || ''
	const theaters = theater.filter(
		({ area, city }) => {
			if (searchMethod(city, maybe_city)) {
				if (chunks.length > 0) {
					return searchMethod(area, chunks.join(' '))
				}
				return true
			}
			return searchMethod(area, query)
		}
	)

	const schedule_by_theater = await Promise.all(
		theaters.map(v =>
			schedule(v.code, yyyymmdd).then(
				z => ({ schedule: z, theater: v }),
				e => {
					throw Error(e)
				},
			),
		),
	)
	return schedule_by_theater
		.map(s => {
			if (!s) return null

			const schedules = s.schedule.filter(v =>
				searchMethod(v.movie, movie_name),
			)

			if (schedules.length <= 0) return null
			return { theater: s.theater, schedule: schedules }
		})
		.filter(
			(
				v: { theater: Theater; schedule: Schedule[] } | null,
			): v is Exclude<typeof v, null> => v != null,
		)
}

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
			f = await download()
			fs.writeFile(cachePath, JSON.stringify(f), 'utf8')
		}

		const inst = search(f)
		console.log(
			(await inst(process.argv[2], process.argv[3], process.argv[4]))
				.map(({ theater, schedule }) => prettyPrint(theater, schedule))
				.join('\n\n'),
		)
	})()
