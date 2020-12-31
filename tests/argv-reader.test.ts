import ArgvReader from '../lib/argv-reader'
import { InvalidOptionError } from '../lib/exception'

describe('argv-reader', () => {
  describe('ArgvReader', () => {
    describe('parse options', () => {
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
    describe('parse arguments', () => {
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
    describe('parse plural arguments', () => {
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
    describe('abort', () => {
      type RawOpts = {
      }
      const context: {
        reader: ArgvReader<unknown, RawOpts>
      } = {
        reader: null!
      }
      beforeAll(() => {
        context.reader = new ArgvReader<unknown, RawOpts>(
          _ => {
            return '?' as any
          },
          opts => opts as RawOpts,
        )
      })
      it('aborts if invalid action is returned', () => {
        expect(() => context.reader.read([''])).toThrowError(/unknown arg type/)
      })
    })
  })
})
