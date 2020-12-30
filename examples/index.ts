import util from 'util'
import { ArgvReader } from '../index'
import { InvalidOptionError, InvalidOptionValueError } from '../index'
import { CommandlineError } from '../lib/exception'
import { ApplicationCommandlineError } from './exception'
 // replace '../index' with 'argv-reader' to run the example app separately

const main = async () => {
  try {
    const rest = process.argv.slice(2)
    await dispatch(rest)
  } catch (err) {
    if (err instanceof ApplicationCommandlineError) {
      console.error(`error: ${err.err.message}`)
      console.error(`\n${err.showHelp()}`)
      if (err.parsing != null) {
        console.log('command line option is interpreted as below:')
        console.log(util.inspect(err.parsing, { depth: 8, compact: true, breakLength: Infinity }))
      }
    } else {
      throw err
    }
  }
}

const dispatch = async (rest: string[]) => {
  const topOpts = await top(rest)
  switch (topOpts.command) {
    case 'build': {
      const opts = build(topOpts.rest)
      await doSomeWork('build', topOpts, opts)
      break
    }
    case 'release': {
      const opts = release(topOpts.rest)
      await doSomeWork('release', topOpts, opts)
      break
    }
  }
}

type AnyOf<T extends readonly any[]> = T[number]
const knownCommands = ['build', 'release'] as const
const isKnownCommand = (command: string): command is TopOpts['command'] =>
  (knownCommands as readonly string[]).includes(command)

type TopOpts = {
  verbose: number
  command: AnyOf<typeof knownCommands>
  rest: string[]
}

const top = (argv: string[]): TopOpts => {
  const help = `\
usage: [options] <command> [arguments-for-command]

command:
  build			run build tool
  release		release a version of apps

options:
  -v|--verbose		verbose output
`
  type ParsingTopOpts = {
    multiflags: {
      verbose?: number
    }
    arguments: {
      command?: string[]
    }
    rest: string[]
  }
  const reader = new ArgvReader<'rest', ParsingTopOpts>(
    (arg, state) => {
      if (state === 'rest') {
        return ['argument', 'rest']
      }
      if (arg.startsWith('-')) {
        if (arg === '--') {
          return 'rest'
        }
        switch (arg) {
          case '-v': case '--verbose':
            return ['multiflag', 'verbose']
        }
        if (/^-vv+$/.test(arg)) {
          return ['replace', arg.split('').slice(1).map(a => `-${a}`)]
        }
        throw new ApplicationCommandlineError(new InvalidOptionError(`unknown option: ${arg}`, 'unknown-option', arg), () => help)
      }
      if (state == null) {
        return ['argument', 'command', 'rest']
      }
      return false
    },
    opts => opts as ParsingTopOpts
  )
  const parsing = handleCommandlineError(() => reader.read(argv), () => help)
  if (parsing.arguments.command == null || parsing.arguments.command.length === 0) {
    throw new ApplicationCommandlineError(new InvalidOptionError(`command is mandatory`, 'missing-command', 'command'), () => help, parsing)
  }
  if (!isKnownCommand(parsing.arguments.command[0])) {
    throw new ApplicationCommandlineError(new InvalidOptionValueError(`unknown command: ${parsing.arguments.command}`, 'unknown-command', 'command', parsing.arguments.command), () => help, parsing)
  }
  return {
    verbose: parsing.multiflags.verbose ?? 0,
    command: parsing.arguments.command[0],
    rest: parsing.rest,
  }
}

type BuildOpts = {
  dryRun: boolean
  tool1: {
    version: string
    workdir: string
  }
  tool2: {
    version: string
    workdir: string
  }
  files: string[]
}

const build = (argv: string[]): BuildOpts => {
  const help = `\
usage: build
         [options]
         '+TOOL1'|'+TOOL2'
           [tool-options] ['-@'] <tool-workdir>
         ['-TOOL1'|'-TOOL2']
         ['--']
         <files>

options:
  -t|--dry-run		dry run

'+/-TOOL1|TOOL2'
  argument context separator that delimits each tool options.
  (+... is required for each app; -... is optional)

tool-options:
  -V <version>		version to use

tool-workdir:
  working directory where each tool runs
  ('-@' can be used to specify the path starting with '-' verbatim)
`
  type ParsingBuildOpts = {
    flags: {
      dryRun?: boolean
    }
    singles: {
      tool1version?: string
      tool2version?: string
    }
    arguments: {
      tool1workdir?: string[]
      tool2workdir?: string[]
    }
    rest: string[]
  }
  const reader = new ArgvReader<null | 'tool1' | 'tool1-v' | 'tool2' | 'tool2-v', ParsingBuildOpts>(
    (arg, state) => {
      if (arg === '--') {
        return ['rest', null]
      }
      switch (state) {
        case 'tool1':
          if (arg.startsWith('-')) {
            switch (arg) {
              case '-V':
                return ['single', 'tool1version']
              case '-@':
                return ['skip', 'tool1-v']
              case '-TOOL1':
                return ['skip', null]
              case '+TOOL2':
                return ['skip', 'tool2']
            }
            throw new ApplicationCommandlineError(new InvalidOptionError(`unknown option: ${arg}`, 'unknown-option', arg), () => help)
          }
          switch (arg) {
            case '+TOOL2':
              return ['skip', 'tool2']
          }
          return ['argument', 'tool1workdir']
        case 'tool1-v':
          return ['argument', 'tool1workdir', 'tool1']
        case 'tool2':
          if (arg.startsWith('-')) {
            switch (arg) {
              case '-V':
                return ['single', 'tool2version']
              case '-@':
                return ['skip', 'tool2-v']
              case '-TOOL2':
                return ['skip', null]
            }
            throw new ApplicationCommandlineError(new InvalidOptionError(`unknown option: ${arg}`, 'unknown-option', arg), () => help)
          }
          switch (arg) {
            case '+TOOL1':
              return ['skip', 'tool1']
          }
          return ['argument', 'tool2workdir']
        case 'tool2-v':
          return ['argument', 'tool2workdir', 'tool2']
        default:
          if (arg.startsWith('-')) {
            switch (arg) {
              case '-t': case '--dry-run':
                return ['flag', 'dryRun']
            }
            throw new ApplicationCommandlineError(new InvalidOptionError(`unknown option: ${arg}`, 'unknown-option', arg), () => help)
          }
          switch (arg) {
            case '+TOOL1':
              return ['skip', 'tool1']
            case '+TOOL2':
              return ['skip', 'tool2']
          }
          return false
      }
    },
    opts => opts as ParsingBuildOpts
  )
  const parsing = handleCommandlineError(() => reader.read(argv), () => help)
  if (parsing.arguments.tool1workdir == null || parsing.arguments.tool1workdir.length === 0) {
    throw new ApplicationCommandlineError(new InvalidOptionError(`tool1-workdir is mandatory`, 'missing-argument', 'tool1-workdir'), () => help, parsing)
  }
  if (parsing.arguments.tool1workdir.length !== 1) {
    throw new ApplicationCommandlineError(new InvalidOptionValueError(`exactly one tool1-workdir can be specified`, 'expect-one', 'tool1-workdir', parsing.arguments.tool1workdir), () => help, parsing)
  }
  if (parsing.arguments.tool2workdir == null || parsing.arguments.tool2workdir.length === 0) {
    throw new ApplicationCommandlineError(new InvalidOptionError(`tool2-workdir is mandatory`, 'missing-argument', 'tool2-workdir'), () => help, parsing)
  }
  if (parsing.arguments.tool2workdir.length !== 1) {
    throw new ApplicationCommandlineError(new InvalidOptionValueError(`exactly one tool2-workdir can be specified`, 'expect-one', 'tool2-workdir', parsing.arguments.tool2workdir), () => help, parsing)
  }
  if (parsing.rest.length === 0) {
    throw new ApplicationCommandlineError(new InvalidOptionValueError(`at lease one file should be specified`, 'expect-one', 'files'), () => help, parsing)
  }
  return {
    dryRun: parsing.flags.dryRun ?? false,
    tool1: {
      version: parsing.singles.tool1version ?? '',
      workdir: parsing.arguments.tool1workdir[0],
    },
    tool2: {
      version: parsing.singles.tool2version ?? '',
      workdir: parsing.arguments.tool2workdir[0],
    },
    files: parsing.rest,
  }
}

type ReleaseOpts = {
  dryRun: boolean
  app: string
  version: string
}

const release = (argv: string[]): ReleaseOpts => {
  const help = `\
usage: release [options]

options:
  -t|--dry-run		dry run
  -a|--app <app>	application name to release
  -r|--release [<version>]
			application version to release
`
  type ParsingReleaseOpts = {
    flags: {
      dryRun?: boolean
    }
    singles: {
      app?: string
      version?: string
    }
  }
  const reader = new ArgvReader(
    arg => {
      if (arg.startsWith('-')) {
        if (arg === '--') {
          return 'rest'
        }
        switch (arg) {
          case '-t': case '--dry-run':
            return ['flag', 'dryRun']
          case '-a': case '--app':
            return ['single', 'app']
          case '-r': case '--release':
            return ['lookahead', la => la == null || la.startsWith('-')
              ? ['replace', [arg, '']]
              : ['single', 'version']]
        }
      }
      throw new ApplicationCommandlineError(new InvalidOptionValueError(`can not take any arguments: ${arg}`, 'expect-no-argument', 'argument', arg), () => help)
    },
    opts => opts as ParsingReleaseOpts
  )
  const parsing = handleCommandlineError(() => reader.read(argv), () => help)
  if (parsing.singles.app == null) {
    throw new ApplicationCommandlineError(new InvalidOptionError(`app is mandatory`, 'missing-argument', 'app'), () => help, parsing)
  }
  if (parsing.singles.version == null) {
    throw new ApplicationCommandlineError(new InvalidOptionError(`version is mandatory`, 'missing-argument', 'version'), () => help, parsing)
  }
  return {
    dryRun: parsing.flags.dryRun ?? false,
    app: parsing.singles.app ?? '',
    version: parsing.singles.version ?? '',
  }
}

const handleCommandlineError = <T>(f: () => T, showHelp: () => string) => {
  try {
    return f()
  } catch (err) {
    if (err instanceof CommandlineError) {
      throw new ApplicationCommandlineError(err, showHelp)
    } else {
      throw err
    }
  }
}

const doSomeWork = async <T>(command: TopOpts['command'], topOpts: TopOpts, opts: T) => {
  console.log('dummy work:')
  console.log(util.inspect(topOpts, { depth: 8, compact: true, breakLength: Infinity }))
  console.log(util.inspect(opts, { depth: 8, compact: true, breakLength: Infinity }))
}


main().catch(err => {
  process.exitCode = 1
  console.error(err)
})
