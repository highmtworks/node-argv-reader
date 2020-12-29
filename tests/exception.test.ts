import { CommandlineError, InvalidOptionError, InvalidOptionValueError, newPredefinedInvalidOptionValueError } from '../lib/exception'

describe('exception', () => {
  describe('CommndlineError', () => {
    it('instantiates with message', () => {
      const err = new CommandlineError('message1')
      expect(err.message).toStrictEqual('message1')
    })
    it('instantiates as of type CommndlineError', () => {
      const err = new CommandlineError('message1')
      expect(err).toBeInstanceOf(CommandlineError)
    })
  })
  describe('InvalidOptionError', () => {
    it('instantiates with message', () => {
      const err = new InvalidOptionError('message1', 'unknown-option', 'opt1')
      expect(err.message).toStrictEqual('message1')
    })
    it('instantiates with opt name', () => {
      const err = new InvalidOptionError('message1', 'unknown-option', 'opt1')
      expect(err.optionName).toStrictEqual('opt1')
    })
    it('instantiates as of type CommndlineError', () => {
      const err = new InvalidOptionError('message1', 'unknown-option', 'opt1')
      expect(err).toBeInstanceOf(CommandlineError)
    })
    it('instantiates as of type InvalidOptionError', () => {
      const err = new InvalidOptionError('message1', 'unknown-option', 'opt1')
      expect(err).toBeInstanceOf(InvalidOptionError)
    })
  })
  describe('InvalidOptionValueError', () => {
    it('instantiates with message', () => {
      const err = new InvalidOptionValueError('message1', 'missing-argument', 'opt1')
      expect(err.message).toStrictEqual('message1')
    })
    it('instantiates with opt name', () => {
      const err = new InvalidOptionValueError('message1', 'missing-argument', 'opt1')
      expect(err.optionName).toStrictEqual('opt1')
    })
    it('instantiates with opt value', () => {
      const err = new InvalidOptionValueError('message1', 'missing-argument', 'opt1', 'value1')
      expect(err.optionValue).toStrictEqual('value1')
    })
    it('instantiates as of type CommndlineError', () => {
      const err = new InvalidOptionValueError('message1', 'missing-argument', 'opt1')
      expect(err).toBeInstanceOf(CommandlineError)
    })
    it('instantiates as of type InvalidOptionValueError', () => {
      const err = new InvalidOptionValueError('message1', 'missing-argument', 'opt1')
      expect(err).toBeInstanceOf(InvalidOptionValueError)
    })
  })
  describe('predefined error', () => {
    it('throws missing-argument error', () => {
      const err = newPredefinedInvalidOptionValueError('message1', 'missing-argument', 'opt1')
      expect(err.message).toStrictEqual('message1')
    })
  })
})
