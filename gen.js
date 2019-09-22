#!/usr/bin/env node
const { readFile, writeFile } = require('fs').promises

// A naive YAML parser

const tokenize = yaml =>
	yaml
		.split('\n')
		.filter(line => line.trim() !== '')
		.map(line => {
			let indent = 0
			let key = null
			let string = false
			line = line
				.replace(/^\s+/, m => {
					indent = m.length
					return ''
				})
				.replace(/^(?:'([^:]+)'|([^:]+)):\s*/, (_, p1, p2) => {
					key = p1 || p2
					return ''
				})
				.replace(/^'(.*)'$/, (_, p1) => {
					string = true
					return p1
				})
			return { indent, key, line, string }
		})

const parser = tokens => {
	const first = tokens.shift()
	if (first == null) return []

	const childLen = tokens.findIndex(v => v.indent <= first.indent)
	const child = childLen < 0 ? tokens.splice(0) : tokens.splice(0, childLen)

	if (!first.string) {
		const line = (first.line = first.line.trim())

		if (line === '') first.line = Object.assign({}, ...parser(child))
		else if (line === 'false' || line === 'true')
			first.line = line === 'true'
		else if (/^[0-9]+$/.test(line)) first.line = +line
	}

	return [{ [first.key]: first.line }].concat(parser(tokens))
}

const parse = yaml => Object.assign({}, ...parser(tokenize(yaml)))

const writer = configs => {
	Object.entries(configs).map(([filename, object]) =>
		writeFile(filename, JSON.stringify(object, null, 2), 'utf8'),
	)
}

const runner = yaml => writer(parse(yaml))

if (require.main === module) readFile('./config.yaml', 'utf8').then(runner)
else module.exports = { parse, runner }
