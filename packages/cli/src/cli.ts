const VERSION = __APP_VERSION__

const HELP_TEXT = `auto-code - A modern TypeScript CLI template built with Vite.

Usage:
  auto-code [command] [options]

Commands:
  hello [name]   Print a greeting

Options:
  -h, --help     Show help
  -v, --version  Show version

Examples:
  auto-code hello
  auto-code hello Alice`

const args = process.argv.slice(2)

if (args.includes('-h') || args.includes('--help')) {
  console.log(HELP_TEXT)
  process.exit(0)
}

if (args.includes('-v') || args.includes('--version')) {
  console.log(VERSION)
  process.exit(0)
}

const [command, ...rest] = args

if (!command) {
  console.log(HELP_TEXT)
  process.exit(0)
}

switch (command) {
  case 'hello': {
    const name = rest[0] ?? 'world'
    console.log(`Hello, ${name}!`)
    break
  }
  default:
    console.error(`Unknown command: ${command}`)
    console.log(HELP_TEXT)
    process.exitCode = 1
}
