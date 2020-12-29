import { newPredefinedInvalidOptionValueError } from './exception'

const namedArgType = ['flag', 'multiflag', 'noflag', 'single', 'multiple', 'argument'] as const
const noNameArgType = [false, 'rest', 'skip'] as const
const replaceArgType = ['replace'] as const
const lookAheadArgType = ['lookahead'] as const

type AnyOf<T extends readonly any[]> = T[number]

type NamedArgType = AnyOf<typeof namedArgType>
type NoNameArgType = AnyOf<typeof noNameArgType>
type ReplaceArgType = AnyOf<typeof replaceArgType>
type LookAheadArgType = AnyOf<typeof lookAheadArgType>

type ExtractorType<S> = (arg: string, state?: S) => [NamedArgType, string, S?]
  | [NoNameArgType, S?] | NoNameArgType
  | [ReplaceArgType, string[], S?]
  | [LookAheadArgType, CallbackType<S>]
type ExtractedType<S> = ReturnType<ExtractorType<S>>

type CallbackType<S> = (arg?: string, state?: S) => [NamedArgType, string, S?]
  | [NoNameArgType, S?] | NoNameArgType
  | [ReplaceArgType, string[], S?]

type OptsType = {
  flags: { [key: string]: boolean },
  multiflags: { [key: string]: number },
  singles: { [key: string]: string },
  multiples: { [key: string]: string[] },
  arguments: { [key: string]: string[] },
  rest: string[]
}

type ConverterType<A> = (opts: OptsType) => A

const isNamedArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [NamedArgType, string, S?] => {
  return isNamedArg(s[0])
}

const isNoNameArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [NoNameArgType, S?] => {
  return isNoNameArg(s[0])
}

const isReplaceArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [ReplaceArgType, string[], S?] => {
  return isReplaceArg(s[0])
}

const isLookAheadArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [LookAheadArgType, CallbackType<S>] => {
  return isLookAheadArg(s[0])
}

const isNamedArg = (s: NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType): s is NamedArgType => {
  return (namedArgType as readonly (boolean | string)[]).includes(s)
}

const isNoNameArg = (s: NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType): s is NoNameArgType => {
  return (noNameArgType as readonly (boolean | string)[]).includes(s)
}

const isReplaceArg = (s: NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType): s is ReplaceArgType => {
  return (replaceArgType as readonly (boolean | string)[]).includes(s)
}

const isLookAheadArg = (s: NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType): s is LookAheadArgType => {
  return (lookAheadArgType as readonly (boolean | string)[]).includes(s)
}

export default class ArgvReader<S, A> {
  readonly extractor: ExtractorType<S>
  readonly converter: ConverterType<A>

  constructor(extractor: ExtractorType<S>, converter: ConverterType<A>) {
    this.extractor = extractor
    this.converter = converter
  }

  read(argv: string[]) {
    const opts: OptsType = {
      flags: {}, multiflags: {},
      singles: {}, multiples: {},
      arguments: {}, rest: []
    }
    let state: S | undefined = undefined
    let isRest = false
    let optSingle = null
    let optMulti = null
    let i = 0
    const xargv = [...argv]
    while (i < xargv.length) {
      const arg = xargv[i++]
      if (isRest) {
        opts.rest.push(arg)
        continue
      }
      if (optSingle != null) {
        opts.singles[optSingle] = arg
        optSingle = null
        continue
      }
      if (optMulti != null) {
        if (opts.multiples[optMulti] == null) {
          opts.multiples[optMulti] = [arg]
        } else {
          opts.multiples[optMulti].push(arg)
        }
        optMulti = null
        continue
      }

      const parse = (extracted: ExtractedType<S>) => {
        while (true) {
          const [argType, optName, nextState, replacer, lookahead] = !Array.isArray(extracted)
            ? [extracted, '', undefined, [], undefined]
            : (isNamedArgTuple(extracted)
              ? [extracted[0], extracted[1], extracted[2], [], undefined]
              : isNoNameArgTuple(extracted)
                ? [extracted[0], '', extracted[1], [], undefined]
                : isReplaceArgTuple(extracted)
                  ? [extracted[0], '', extracted[2], extracted[1], undefined]
                  : isLookAheadArgTuple(extracted)
                    ? [extracted[0], '', undefined, [], extracted[1]]
                    : [undefined, '', undefined, [], undefined])
          if (argType === 'lookahead') {
            extracted = lookahead!(xargv[i], state)
            continue
          }
          return [argType, optName, nextState, replacer] as const
        }
      }

      const extracted = this.extractor(arg, state)
      const [argType, optName, nextState, replacer] = parse(extracted)

      if (nextState !== undefined) {
        state = nextState
      }
      switch (argType) {
        case 'flag':
          opts.flags[optName] = true
          break
        case 'multiflag':
          opts.multiflags[optName] ??= 0
          opts.multiflags[optName] += 1
          break
        case 'noflag':
          opts.flags[optName] = false
          break
        case 'single':
          optSingle = optName
          break
        case 'multiple':
          optMulti = optName
          break
        case 'argument':
          if (optName === 'rest') {
            opts.rest.push(arg)
            isRest = true
          } else if (opts.arguments[optName] == null) {
            opts.arguments[optName] = [arg]
          } else {
            opts.arguments[optName].push(arg)
          }
          break
        case 'rest':
          isRest = true
          break
        case 'skip':
          break
        case 'replace':
          --i
          xargv.splice(i, 1, ...replacer)
          break
        case false:
          opts.rest.push(arg)
          break
        default:
          throw new Error(`unknown arg type: ${argType}`)
      }
    }
    if (optSingle != null) {
      throw newPredefinedInvalidOptionValueError(`the argument of ${optSingle} is not specified`, 'missing-argument', optSingle,)
    }
    if (optMulti != null) {
      throw newPredefinedInvalidOptionValueError(`the argument of ${optMulti} is not specified`, 'missing-argument', optMulti,)
    }
    return this.converter(opts)
  }
}
