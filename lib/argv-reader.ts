import { newPredefinedInvalidOptionValueError } from './exception'

const namedArgType = ['flag', 'multiflag', 'noflag', 'single', 'multiple', 'argument'] as const
const noNameArgKeyType = ['rest', 'skip'] as const
const noNameArgType = [false, ...noNameArgKeyType] as const
const replaceArgType = ['replace'] as const
const lookAheadArgType = ['lookahead'] as const

type AnyOf<T extends readonly any[]> = T[number]

type NamedArgType = AnyOf<typeof namedArgType>
type NoNameArgKeyType = AnyOf<typeof noNameArgKeyType>
type NoNameArgType = AnyOf<typeof noNameArgType>
type ReplaceArgType = AnyOf<typeof replaceArgType>
type LookAheadArgType = AnyOf<typeof lookAheadArgType>

type RecPartial<T> = {
  [P in keyof T]?: Partial<T[P]>;
}

type MapNameTypeOfNamedArg<K extends NamedArgType, I extends RecPartial<OptsType>> =
  K extends 'flag' ? keyof I['flags'] :
  K extends 'multiflag' ? keyof I['multiflags'] :
  K extends 'noflag' ? keyof I['flags'] :
  K extends 'single' ? keyof I['singles'] :
  K extends 'multiple' ? keyof I['multiples'] :
  K extends 'argument' ? keyof I['arguments'] | 'rest' :
  never

type MapExtractedypeOfNamedArgKey<S, K extends NamedArgType, I extends RecPartial<OptsType>> =
  [K, MapNameTypeOfNamedArg<K, I>, S?] | { type: K, name: MapNameTypeOfNamedArg<K, I>, state?: S }

type ExtractorReturnTypeOfNamedArg<S, I extends RecPartial<OptsType>> =
  MapExtractedypeOfNamedArgKey<S, 'flag', I>
  | MapExtractedypeOfNamedArgKey<S, 'multiflag', I>
  | MapExtractedypeOfNamedArgKey<S, 'noflag', I>
  | MapExtractedypeOfNamedArgKey<S, 'single', I>
  | MapExtractedypeOfNamedArgKey<S, 'multiple', I>
  | MapExtractedypeOfNamedArgKey<S, 'argument', I>

type ExtractorType<S, I extends RecPartial<OptsType>> = (arg: string, state?: S) =>
  ExtractorReturnTypeOfNamedArg<S, I>
  | [NoNameArgType, S?] | NoNameArgType | { type: NoNameArgKeyType, state?: S }
  | [ReplaceArgType, string[], S?] | { type: ReplaceArgType, replace: string[], state?: S }
  | [LookAheadArgType, CallbackType<S, I>] | { type: LookAheadArgType, lookahead: CallbackType<S, I> }

type ExtractorReturnType<S, I extends RecPartial<OptsType>> = ReturnType<ExtractorType<S, I>>

type CallbackType<S, I extends RecPartial<OptsType>> = (arg?: string, state?: S) =>
  ExtractorReturnTypeOfNamedArg<S, I>
  | [NoNameArgType, S?] | NoNameArgType | { type: NoNameArgKeyType, state?: S }
  | [ReplaceArgType, string[], S?] | { type: ReplaceArgType, replace: string[], state?: S }

type OptsType = {
  flags: { [key: string]: boolean },
  multiflags: { [key: string]: number },
  singles: { [key: string]: string },
  multiples: { [key: string]: string[] },
  arguments: { [key: string]: string[] },
  rest: string[]
}

type ConverterType<A, I extends RecPartial<OptsType>> = (opts: Pick<I, keyof OptsType>) => A

const isNamedArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [NamedArgType, string, S?] => {
  return isNamedArg(s[0])
}

const isNoNameArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [NoNameArgType, S?] => {
  return isNoNameArg(s[0])
}

const isReplaceArgTuple = <S>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [ReplaceArgType, string[], S?] => {
  return isReplaceArg(s[0])
}

const isLookAheadArgTuple = <S, I extends RecPartial<OptsType>>(s: [NamedArgType | NoNameArgType | ReplaceArgType | LookAheadArgType, unknown?, unknown?]): s is [LookAheadArgType, CallbackType<S, I>] => {
  return isLookAheadArg(s[0])
}

const isNamedArgStruct = <S>(t: object | { type: string }): t is { type: NamedArgType, name: string, state?: S } => {
  return ('type' in t) && (namedArgType as readonly string[]).includes(t.type)
}

const isNoNameArgStruct = <S>(t: object | { type: string }): t is { type: NoNameArgKeyType, state?: S } => {
  return ('type' in t) && (noNameArgKeyType as readonly string[]).includes(t.type)
}

const isReplaceArgStruct = <S>(t: object | { type: string }): t is { type: ReplaceArgType, replace: string[], state?: S } => {
  return ('type' in t) && (replaceArgType as readonly string[]).includes(t.type)
}

const isLookAheadArgStruct = <S, I>(t: object | { type: string }): t is { type: LookAheadArgType, lookahead: CallbackType<S, I> } => {
  return ('type' in t) && (lookAheadArgType as readonly string[]).includes(t.type)
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

export default class ArgvReader<S, A, I extends RecPartial<OptsType> = OptsType> {
  readonly extractor: ExtractorType<S, I>
  readonly converter: ConverterType<A, I>

  constructor(extractor: ExtractorType<S, I>, converter: ConverterType<A, I>) {
    // NOTE: Currenty S is not inferred correctly.
    //       Replacing S in tuples with { state: S } will resove this,
    //       but it brings breaking change to API.
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

      const parse = (extracted: ExtractorReturnType<S, I>, inLookAhead: boolean) => {
        while (true) {
          const [argType, optName, nextState, replacer, lookahead] = !Array.isArray(extracted)
            ? !(extracted instanceof Object)
              ? [extracted, '', undefined, [], undefined]
              : isNamedArgStruct(extracted)
                ? [extracted.type, extracted.name, extracted.state, [], undefined]
                : isNoNameArgStruct(extracted)
                  ? [extracted.type, '', extracted.state, [], undefined]
                  : isReplaceArgStruct(extracted)
                    ? [extracted.type, '', extracted.state, extracted.replace, undefined]
                    : isLookAheadArgStruct<S, I>(extracted)
                      ? [extracted.type, '', undefined, [], extracted.lookahead]
                      : [undefined, '', undefined, [], undefined]
            : isNamedArgTuple(extracted)
              ? [extracted[0], extracted[1], extracted[2], [], undefined]
              : isNoNameArgTuple(extracted)
                ? [extracted[0], '', extracted[1], [], undefined]
                : isReplaceArgTuple(extracted)
                  ? [extracted[0], '', extracted[2], extracted[1], undefined]
                  : isLookAheadArgTuple(extracted)
                    ? [extracted[0], '', undefined, [], extracted[1]]
                    : [undefined, '', undefined, [], undefined]
          if (argType === 'lookahead') {
            if (inLookAhead) throw new Error(`lookahead in lookahead is not allowed`)
            extracted = lookahead!(xargv[i], state)
            inLookAhead = true
            continue
          }
          return [argType, optName, nextState, replacer] as const
        }
      }

      const extracted = this.extractor(arg, state)
      const [argType, optName, nextState, replacer] = parse(extracted, false)

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
