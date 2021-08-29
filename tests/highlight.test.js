import torchlight from '../src/torchlight'
import Block from '../src/block'

process.env.TORCHLIGHT_TOKEN = 'test'

beforeEach(() => {
  torchlight.init()
  torchlight.cache.clear()
  torchlight.logger.silence()
})

function mockRequest (cb) {
  torchlight.swapRequestor(function (url, data, config) {
    let response = cb(data, config, url) || []

    return Promise.resolve({ data: { blocks: response } })
  })
}

function makeBlock (data) {
  if (typeof data === 'undefined') {
    data = 'test code'
  }

  if (typeof data === 'string') {
    data = {
      code: data,
    }
  }

  return new Block({
    language: 'js',
    ...data,
  })
}

test('basic', () => {
  let block = makeBlock()

  mockRequest(({ blocks }) => {
    expect(blocks[0].code).toEqual('test code')
    expect(blocks[0].language).toEqual('js')

    return [{
      ...blocks[0],
      highlighted: 'highlighted'
    }]
  })

  // Nothing in the cache
  expect(block.getResponseDataFromCache()).toEqual({})

  return torchlight.highlight([block]).then(() => {
    // Block should match what was returned from the API.
    expect(block.highlighted).toEqual('highlighted')

    // Cache should be populated now.
    expect(block.getResponseDataFromCache()).not.toEqual({})
  })
})

test('blocks in the cache arent requested', () => {
  let block = makeBlock()
  let called = false

  mockRequest(() => called = true)

  block.populateCache({
    highlighted: 'from cache'
  })

  return torchlight.highlight([block]).then(() => {
    // Block should match what was returned from the API.
    expect(block.highlighted).toEqual('from cache')
    expect(called).toEqual(false)
  })
})

test('cached and uncached can be mixed', () => {
  let blocks = [
    makeBlock('test 1'),
    makeBlock('test 2'),
  ]

  mockRequest(({ blocks }) => {
    return [{
      ...blocks[0],
      highlighted: 'from api',
    }]
  })

  blocks[0].populateCache({
    highlighted: 'from cache'
  })

  return torchlight.highlight(blocks).then(() => {
    expect(blocks[0].highlighted).toEqual('from cache')
    expect(blocks[1].highlighted).toEqual('from api')
  })
})

test('requests are fanned', () => {
  let blocks = []
  let called = 0

  for (let i = 0; i < 100; i++) {
    blocks.push(makeBlock(`Block ${i}`))
  }

  mockRequest(() => {
    called++
    return []
  })

  return torchlight.highlight(blocks).then(() => {
    expect(called).toEqual(4)
  })
})

test('config options affect hash', () => {
  let block = makeBlock()

  let hash = block.hash()

  torchlight.reinit({
    options: {
      bar: 'buz'
    }
  })

  expect(hash).not.toEqual(block.hash())

})

test('block theme overrides global theme', () => {
  torchlight.reinit({
    theme: 'nord'
  })

  let block = makeBlock({
    code: 'test',
    theme: 'material'
  })

  expect(block.theme).toEqual('material')
})

test('every block gets a default', () => {
  let block = makeBlock('some\ntest')

  // No response from the API.
  mockRequest(() => [])

  return torchlight.highlight([block]).then(function () {
    expect(block.highlighted).toEqual('<div class="line">some</div><div class="line">test</div>')
  })
})
