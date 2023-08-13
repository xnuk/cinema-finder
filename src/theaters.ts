import { parse, HTMLElement, TextNode } from 'node-html-parser'
import type { HTTPGetRequestText, HTTPGetRequestJson } from './interface.ts'

export interface Theater {
	code: string
	name: string
	city: string
	area: string
}

export interface Schedule {
	screen: string
	movie: string
	code: string
	timetable: string[]
}

const zipWith = <A, B, T>(a: A[], b: B[], func: (a: A, b: B) => T): T[] =>
	Array.from({ length: Math.min(a.length, b.length) }, (_, i) =>
		func(a[i]!, b[i]!),
	)

const getText = (v: HTMLElement | TextNode): string => {
	if (v instanceof TextNode) return v.rawText

	return v.childNodes
		.filter(z => z instanceof TextNode)
		.map(z => z.rawText)
		.join(' ')
}

const parser = (html: string): Theater[] => {
	const el = parse(html, {
		lowerCaseTagName: false,
		comment: false,

		blockTextElements: {
			script: false,
			noscript: false,
			pre: false,
			style: false,
		},
	})

	if (el instanceof TextNode) return []

	const table = el.querySelector('table.tbl_exc')

	const ths =
		table?.querySelector('thead')?.querySelectorAll('th').map(getText) ?? []

	const trs =
		table
			?.querySelector('tbody')
			?.querySelectorAll('tr')
			.map(v => v.querySelectorAll('td').map(getText)) ?? []

	return trs
		.map(row =>
			Object.assign({}, ...zipWith(ths, row, (k, v) => ({ [k]: v }))),
		)
		.filter(row => row.영업상태 === '영업')
		.map(row => ({
			code: row.영화상영관코드,
			name: row.영화상영관명,
			city: row.광역단체,
			area: row.기초단체,
		}))
}
const theatersURL =
	'https://www.kobis.or.kr/kobis/business/mast/thea/findTheaterInfoListXls.do'

export const getTheaters = (request: HTTPGetRequestText) => async () =>
	parser(
		await request(theatersURL, {
			sSaleStat: '018201', // 영업중
		}),
	)

const scheduleURL =
	'https://www.kobis.or.kr/kobis/business/mast/thea/findSchedule.do'

export const getSchedule =
	(request: HTTPGetRequestJson) =>
	async (theater: string, yyyymmdd: string): Promise<Schedule[]> => {
		const rawData = await request(scheduleURL, {
			theaCd: theater,
			showDt: yyyymmdd,
		})

		return rawData['schedule'].map(
			({
				scrnNm: screen,
				movieNm: movie,
				movieCd: code,
				showTm: timetable,
			}: any) => ({
				screen,
				movie: movie || '',
				code,
				timetable: timetable.split(','),
			}),
		)
	}
