import ArgvReader from '../lib/argv-reader'
import { InvalidOptionError } from '../lib/exception'

describe('argv-reader', () => {
  describe('ArgvReader', () => {
    describe('parse options by returning tuple', () => {
      type RawOpts = {
        flags: {
          flag1?: boolean,
        },
        multiflags: {
          multiflag1?: number,
        },
        singles: {
          single1?: string,
          optional1?: string,
        },
        multiples: {
          multiple1?: string[],
        },
        arguments: {
          argument1?: string[],
        },
        rest: string[]
      }
      const context: {
        reader: ArgvReader<unknown, RawOpts, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<unknown, RawOpts, RawOpts>(
          arg => {
            if (arg.startsWith('-')) {
              if (arg === '--') {
                return 'rest'
              }
              switch (arg) {
                case '-f': case '--flag1':
                  return ['flag', 'flag1']
                case '-F': case '--no-flag1':
                  return ['noflag', 'flag1']
                case '-v': case '--multiflag1':
                  return ['multiflag', 'multiflag1']
                case '-s': case '--single':
                  return ['single', 'single1']
                case '-o': case '--optional':
                  return ['lookahead', la => la == null || la.startsWith('-')
                    ? ['replace', [arg, '']]
                    : ['single', 'optional1']]
                case '-m': case '--multiple':
                  return ['multiple', 'multiple1']
              }
              throw new InvalidOptionError(`unknown option: ${arg}`, arg, 'unknown-option')
            }
            return false
          },
          opts => opts,
        )
      })
      it('parses a short flag', () => {
        const opts = context.reader.read(['-f'])
        expect(opts.flags.flag1).toBeTruthy()
      })
      it('parses a long flag', () => {
        const opts = context.reader.read(['--flag1'])
        expect(opts.flags.flag1).toBeTruthy()
      })
      it('parses a short negative flag', () => {
        const opts = context.reader.read(['-f', '-F'])
        expect(opts.flags.flag1).toBeFalsy()
      })
      it('parses a long negativeflag', () => {
        const opts = context.reader.read(['--flag1', '--no-flag1'])
        expect(opts.flags.flag1).toBeFalsy()
      })
      it('parses a short cumulative flag', () => {
        const opts = context.reader.read(['-v', '-v'])
        expect(opts.multiflags.multiflag1).toEqual(2)
      })
      it('parses a long cumulativeflag', () => {
        const opts = context.reader.read(['--multiflag1', '--multiflag1'])
        expect(opts.multiflags.multiflag1).toEqual(2)
      })
      it('parses a short option taking a value', () => {
        const opts = context.reader.read(['-s', 'a-value'])
        expect(opts.singles.single1).toEqual('a-value')
      })
      it('parses a long option taking a value', () => {
        const opts = context.reader.read(['--single', 'a-value'])
        expect(opts.singles.single1).toEqual('a-value')
      })
      it('parses a short option taking multiple values', () => {
        const opts = context.reader.read(['-m', 'value1', '-m', 'value2'])
        expect(opts.multiples.multiple1).toEqual(['value1', 'value2'])
      })
      it('parses a long option taking multiple values', () => {
        const opts = context.reader.read(['--multiple', 'value1', '--multiple', 'value2'])
        expect(opts.multiples.multiple1).toEqual(['value1', 'value2'])
      })
      it('parses a short option taking an optional value which is given', () => {
        const opts = context.reader.read(['-o', 'a-value'])
        expect(opts.singles.optional1).toEqual('a-value')
      })
      it('parses a long option taking an optional value which is given', () => {
        const opts = context.reader.read(['--optional', 'a-value'])
        expect(opts.singles.optional1).toEqual('a-value')
      })
      it('parses a short option taking an optional value which is not given', () => {
        const opts = context.reader.read(['-o', '--'])
        expect(opts.singles.optional1).toEqual('')
      })
      it('parses a long option taking an optional value which is not given', () => {
        const opts = context.reader.read(['--optional', '--'])
        expect(opts.singles.optional1).toEqual('')
      })
      it('parses rest arguments', () => {
        const opts = context.reader.read(['-f', 'a', 'b', 'c'])
        expect(opts.rest).toEqual(['a', 'b', 'c'])
      })
      it('parses rest arguments after the rest marker', () => {
        const opts = context.reader.read(['-f', 'a', 'b', 'c', '--', '-1', '-2'])
        expect(opts.rest).toEqual(['a', 'b', 'c', '-1', '-2'])
      })
      it('throws if an option taking a value is not followed by its argument', () => {
        expect(() => context.reader.read(['-s'])).toThrowError(/argument of single1 is not specified/)
      })
      it('throws if an option taking multiple values is not followed by its argument', () => {
        expect(() => context.reader.read(['-m'])).toThrowError(/argument of multiple1 is not specified/)
      })
      it('throws if an option is unknown', () => {
        expect(() => context.reader.read(['-?'])).toThrowError(/unknown option: -\?/)
      })
    })
    describe('parse options by returning struct', () => {
      type RawOpts = {
        flags: {
          flag1?: boolean,
        },
        multiflags: {
          multiflag1?: number,
        },
        singles: {
          single1?: string,
          optional1?: string,
        },
        multiples: {
          multiple1?: string[],
        },
        arguments: {
          argument1?: string[],
        },
        rest: string[]
      }
      const context: {
        reader: ArgvReader<unknown, RawOpts, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<unknown, RawOpts, RawOpts>(
          arg => {
            if (arg.startsWith('-')) {
              if (arg === '--') {
                return { type: 'rest' }
              }
              switch (arg) {
                case '-f': case '--flag1':
                  return { type: 'flag', name: 'flag1' }
                case '-F': case '--no-flag1':
                  return { type: 'noflag', name: 'flag1' }
                case '-v': case '--multiflag1':
                  return { type: 'multiflag', name: 'multiflag1' }
                case '-s': case '--single':
                  return { type: 'single', name: 'single1' }
                case '-o': case '--optional':
                  return {
                    type: 'lookahead',
                    lookahead: la => la == null || la.startsWith('-')
                      ? { type: 'replace', replace: [arg, ''] }
                      : { type: 'single', name: 'optional1' }
                  }
                case '-m': case '--multiple':
                  return { type: 'multiple', name: 'multiple1' }
              }
              throw new InvalidOptionError(`unknown option: ${arg}`, arg, 'unknown-option')
            }
            return false
          },
          opts => opts,
        )
      })
      it('parses a short flag', () => {
        const opts = context.reader.read(['-f'])
        expect(opts.flags.flag1).toBeTruthy()
      })
      it('parses a long flag', () => {
        const opts = context.reader.read(['--flag1'])
        expect(opts.flags.flag1).toBeTruthy()
      })
      it('parses a short negative flag', () => {
        const opts = context.reader.read(['-f', '-F'])
        expect(opts.flags.flag1).toBeFalsy()
      })
      it('parses a long negativeflag', () => {
        const opts = context.reader.read(['--flag1', '--no-flag1'])
        expect(opts.flags.flag1).toBeFalsy()
      })
      it('parses a short cumulative flag', () => {
        const opts = context.reader.read(['-v', '-v'])
        expect(opts.multiflags.multiflag1).toEqual(2)
      })
      it('parses a long cumulativeflag', () => {
        const opts = context.reader.read(['--multiflag1', '--multiflag1'])
        expect(opts.multiflags.multiflag1).toEqual(2)
      })
      it('parses a short option taking a value', () => {
        const opts = context.reader.read(['-s', 'a-value'])
        expect(opts.singles.single1).toEqual('a-value')
      })
      it('parses a long option taking a value', () => {
        const opts = context.reader.read(['--single', 'a-value'])
        expect(opts.singles.single1).toEqual('a-value')
      })
      it('parses a short option taking multiple values', () => {
        const opts = context.reader.read(['-m', 'value1', '-m', 'value2'])
        expect(opts.multiples.multiple1).toEqual(['value1', 'value2'])
      })
      it('parses a long option taking multiple values', () => {
        const opts = context.reader.read(['--multiple', 'value1', '--multiple', 'value2'])
        expect(opts.multiples.multiple1).toEqual(['value1', 'value2'])
      })
      it('parses a short option taking an optional value which is given', () => {
        const opts = context.reader.read(['-o', 'a-value'])
        expect(opts.singles.optional1).toEqual('a-value')
      })
      it('parses a long option taking an optional value which is given', () => {
        const opts = context.reader.read(['--optional', 'a-value'])
        expect(opts.singles.optional1).toEqual('a-value')
      })
      it('parses a short option taking an optional value which is not given', () => {
        const opts = context.reader.read(['-o', '--'])
        expect(opts.singles.optional1).toEqual('')
      })
      it('parses a long option taking an optional value which is not given', () => {
        const opts = context.reader.read(['--optional', '--'])
        expect(opts.singles.optional1).toEqual('')
      })
      it('parses rest arguments', () => {
        const opts = context.reader.read(['-f', 'a', 'b', 'c'])
        expect(opts.rest).toEqual(['a', 'b', 'c'])
      })
      it('parses rest arguments after the rest marker', () => {
        const opts = context.reader.read(['-f', 'a', 'b', 'c', '--', '-1', '-2'])
        expect(opts.rest).toEqual(['a', 'b', 'c', '-1', '-2'])
      })
      it('throws if an option taking a value is not followed by its argument', () => {
        expect(() => context.reader.read(['-s'])).toThrowError(/argument of single1 is not specified/)
      })
      it('throws if an option taking multiple values is not followed by its argument', () => {
        expect(() => context.reader.read(['-m'])).toThrowError(/argument of multiple1 is not specified/)
      })
      it('throws if an option is unknown', () => {
        expect(() => context.reader.read(['-?'])).toThrowError(/unknown option: -\?/)
      })
    })
    describe('parse arguments by returning tuple', () => {
      type RawOpts = {
        arguments: {
          argument1?: string[],
        },
        rest: string[]
      }
      const context: {
        reader: ArgvReader<'rest', RawOpts, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<'rest', RawOpts, RawOpts>(
          (arg, state) => {
            if (state === 'rest') {
              return ['argument', 'rest']
            }
            if (arg.startsWith('-')) {
              if (arg === '--') {
                return 'rest'
              }
              throw new InvalidOptionError(`unknown option: ${arg}`, arg, 'unknown-option')
            }
            if (state == null) {
              return ['argument', 'argument1', 'rest']
            }
            return false
          },
          opts => opts,
        )
      })
      it('takes the first argument as the argument of command', () => {
        const opts = context.reader.read(['a'])
        expect(opts.arguments.argument1).toEqual(['a'])
        expect(opts.rest).toEqual([])
      })
      it('takes the first argument as the argument of command and takes the rest as the rest arguments', () => {
        const opts = context.reader.read(['a', 'b', '--', 'c'])
        expect(opts.arguments.argument1).toEqual(['a'])
        expect(opts.rest).toEqual(['b', '--', 'c'])
      })
      it('sees the rest marker and takes all arguments after that as the rest arguments', () => {
        const opts = context.reader.read(['--', 'a', 'b', '--', 'c'])
        expect(opts.arguments.argument1).toBeUndefined()
        expect(opts.rest).toEqual(['a', 'b', '--', 'c'])
      })
    })
    describe('parse arguments by returning struct', () => {
      type RawOpts = {
        arguments: {
          argument1?: string[],
        },
        rest: string[]
      }
      const context: {
        reader: ArgvReader<'rest', RawOpts, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<'rest', RawOpts, RawOpts>(
          (arg, state) => {
            if (state === 'rest') {
              return { type: 'argument', name: 'rest' }
            }
            if (arg.startsWith('-')) {
              if (arg === '--') {
                return { type: 'rest' }
              }
              throw new InvalidOptionError(`unknown option: ${arg}`, arg, 'unknown-option')
            }
            if (state == null) {
              return { type: 'argument', name: 'argument1', state: 'rest' }
            }
            return false
          },
          opts => opts,
        )
      })
      it('takes the first argument as the argument of command', () => {
        const opts = context.reader.read(['a'])
        expect(opts.arguments.argument1).toEqual(['a'])
        expect(opts.rest).toEqual([])
      })
      it('takes the first argument as the argument of command and takes the rest as the rest arguments', () => {
        const opts = context.reader.read(['a', 'b', '--', 'c'])
        expect(opts.arguments.argument1).toEqual(['a'])
        expect(opts.rest).toEqual(['b', '--', 'c'])
      })
      it('sees the rest marker and takes all arguments after that as the rest arguments', () => {
        const opts = context.reader.read(['--', 'a', 'b', '--', 'c'])
        expect(opts.arguments.argument1).toBeUndefined()
        expect(opts.rest).toEqual(['a', 'b', '--', 'c'])
      })
    })
    describe('parse plural arguments by returning tuple', () => {
      type RawOpts = {
        arguments: {
          argument1?: string[],
        },
      }
      const context: {
        reader: ArgvReader<null | 'verbatim', RawOpts, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<null | 'verbatim', RawOpts, RawOpts>(
          (arg, state) => {
            if (state === 'verbatim') {
              return ['argument', 'argument1', null]
            } else {
              if (arg.startsWith('-')) {
                if (arg === '--') {
                  return 'rest'
                }
                if (arg === '-@') {
                  return ['skip', 'verbatim']
                }
                throw new InvalidOptionError(`unknown option: ${arg}`, arg, 'unknown-option')
              }
              return ['argument', 'argument1']
            }
          },
          opts => opts,
        )
      })
      it('takes the first argument as the argument of command', () => {
        const opts = context.reader.read(['a'])
        expect(opts.arguments.argument1).toEqual(['a'])
      })
      it('takes the first two arguments  as the argument of command', () => {
        const opts = context.reader.read(['a', 'b'])
        expect(opts.arguments.argument1).toEqual(['a', 'b'])
      })
      it('reads verbatim arguments', () => {
        const opts = context.reader.read(['-@', '-a', '-@', '--'])
        expect(opts.arguments.argument1).toEqual(['-a', '--'])
      })
    })
    describe('parse plural arguments by returning struct', () => {
      type RawOpts = {
        arguments: {
          argument1?: string[],
        },
      }
      const context: {
        reader: ArgvReader<null | 'verbatim', RawOpts, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<null | 'verbatim', RawOpts, RawOpts>(
          (arg, state) => {
            if (state === 'verbatim') {
              return { type: 'argument', name: 'argument1', state: null }
            } else {
              if (arg.startsWith('-')) {
                if (arg === '--') {
                  return { type: 'rest' }
                }
                if (arg === '-@') {
                  return { type: 'skip', state: 'verbatim' }
                }
                throw new InvalidOptionError(`unknown option: ${arg}`, arg, 'unknown-option')
              }
              return { type: 'argument', name: 'argument1' }
            }
          },
          opts => opts,
        )
      })
      it('takes the first argument as the argument of command', () => {
        const opts = context.reader.read(['a'])
        expect(opts.arguments.argument1).toEqual(['a'])
      })
      it('takes the first two arguments  as the argument of command', () => {
        const opts = context.reader.read(['a', 'b'])
        expect(opts.arguments.argument1).toEqual(['a', 'b'])
      })
      it('reads verbatim arguments', () => {
        const opts = context.reader.read(['-@', '-a', '-@', '--'])
        expect(opts.arguments.argument1).toEqual(['-a', '--'])
      })
    })
    describe('abort', () => {
      type RawOpts = {
      }
      const context: {
        reader: ArgvReader<unknown, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<unknown, RawOpts, RawOpts>(
          x => {
            switch (x) {
              case 'invalid action scalar':
                return '?' as any
              case 'invalid action tuple':
                return ['?'] as any
              case 'invalid action struct':
                return { type: '?' } as any
              case 'from lookahead invalid action scalar':
                return ['lookahead', (_: any) => '?'] as any
              case 'from lookahead lookahead tuple':
                return ['lookahead', (_: any) => ['lookahead']] as any
              case 'from lookahead lookahead struct':
                return { type: 'lookahead', lookahead: (_: any) => ({ type: 'lookahead' }) } as any
              default:
                return false
            }
          },
          opts => opts,
        )
      })
      it.each([
        ['invalid action scalar', /unknown arg type/],
        ['invalid action tuple', /unknown arg type/],
        ['invalid action struct', /unknown arg type/],
        ['from lookahead invalid action scalar', /unknown arg type/],
        ['from lookahead lookahead tuple', /lookahead in lookahead is not allowed/],
        ['from lookahead lookahead struct', /lookahead in lookahead is not allowed/],
      ])('aborts if %s is returned', (x, expectedThrown) => {
        expect(() => context.reader.read([x])).toThrowError(expectedThrown)
      })
    })
  })
})
