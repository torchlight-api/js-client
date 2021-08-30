let silent = false

function log (fn, args) {
  args = Array.from(args)

  if (!silent) {
    console[fn](...args)
  }
}

function error () {
  log('error', arguments)
}

function info () {
  log('log', arguments)
}

function silence (silence = true) {
  silent = silence
}

export default {
  error,
  info,
  silence
}
