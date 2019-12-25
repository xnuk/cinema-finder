import { Theater, Schedule, getSchedule } from './theaters'
import { HTTPGetRequestJson } from './interface'

const today = () =>
	new Date(Date.now() + new Date(0).setUTCHours(9 - 2))
		.toISOString()
		.replace(/-|T.*$/g, '')

const searchMethod = (from: string, to: string) => {
	if (!from) throw new Error('')

	return from.includes(to)
}

export const search = (request: HTTPGetRequestJson) => (
	theater: ReadonlyArray<Theater>,
) => async (query: string, movie_name: string, yyyymmdd: string = today()) => {
	const chunks = query.split(' ')
	const maybe_city = chunks.shift() || ''
	const theaters = theater.filter(({ area, city }) => {
		const spaceless_area = area.replace(/ /g, '')
		if (searchMethod(city, maybe_city)) {
			if (chunks.length > 0) {
				return searchMethod(spaceless_area, chunks.join(''))
			}
			return true
		}
		return searchMethod(spaceless_area, query)
	})

	const schedule_by_theater = await Promise.all(
		theaters.map(v =>
			getSchedule(request)(v.code, yyyymmdd).then(
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
