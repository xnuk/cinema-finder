const {createReadStream} = require('fs')
const {Writable} = require('stream')

const split = (search, target) => {
    const index = target.indexOf(search)
    return index >= 0 && {
        before: target.slice(0, index),
        after: target.slice(index + search.length)
    }
}

const take = state => async value => {
    let splited
    while (!(splited = split(value, state.buf()))) await state.more()
    state.update(splited.after)
    return splited.before
}

const mutableBuf = (more, encoding) => {
    let pushed = null, promise = null
    const promiseMaker = () =>
        promise = promise || new Promise(resolve => pushed = () => {
            promise = null
            pushed = null
            resolve()
        })

    let buf = Buffer.alloc(0)

    const state = {
        buf: () => buf,
        update: x => buf = x,
        more: () => promiseMaker(),
    }

    const push = x => ((buf = Buffer.concat([buf, x])), pushed())
    return {push, state}
}

const parse = parser => stream => {
    let cb = () => {};
    const more = () => cb()
    const {push, state} = mutableBuf(more)

    writable = new Writable({
        write(chunk, _, callback) {
            if (chunk == null) return
            push(chunk)
            cb = callback
        }
    })

    writable.on('close', () => push(null))

    stream.pipe(writable)

    return parser(state).then(
        res => (writable.end(), res),
        err => (writable.end(), Promise.reject(err))
    )
}

const Parser = (hash, parser) => parse(state => parser(Object.fromEntries(
    Object.entries(hash).map(([key, func]) => [key, func(state)])
)))

const parser = Parser({take}, async ({take}) => {
    await take('"latest_workflow"')
    await take('{')
    await take('"id"')
    await take(':')
    const res = await take('}')
    return res.toString('utf8').trim().replace(/^"|"$/g, '')
})

parser(createReadStream('./sample.json')).then(console.log)
