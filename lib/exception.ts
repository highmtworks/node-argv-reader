export class CommandlineError extends Error {
  constructor(message: string) {
    const trueProto = new.target.prototype
    super(message)
    this.name = 'CommandlineError'
    Object.setPrototypeOf(this, trueProto)
  }
}

export class InvalidOptionError extends CommandlineError {
  readonly optionName: string
  readonly errorCode: string
  constructor(message: string, errorCode: string, optionName: string) {
    super(message)
    this.name = 'InvalidOptionError'
    this.optionName = optionName
    this.errorCode = errorCode
  }
}

export class InvalidOptionValueError extends CommandlineError {
  readonly optionName: string
  readonly optionValue?: any
  readonly errorCode: string
  constructor(message: string, errorCode: string, optionName: string, optionValue?: any) {
    super(message)
    this.name = 'InvalidOptionValueError'
    this.optionName = optionName
    this.optionValue = optionValue
    this.errorCode = errorCode
  }
}

type AnyOf<T extends readonly any[]> = T[number]
const invalidOptionValueCode = ['missing-argument'] as const
type InvalidOptionValueCodeType = AnyOf<typeof invalidOptionValueCode>

export const newPredefinedInvalidOptionValueError = (message: string, invalidOptionValueCode: InvalidOptionValueCodeType, optionName: string, optionValue?: any): InvalidOptionError =>
  new InvalidOptionValueError(message, invalidOptionValueCode, optionName, optionValue)
