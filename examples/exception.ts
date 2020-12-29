export class ApplicationCommandlineError {
  readonly err: Error
  readonly showHelp: () => string
  readonly parsing?: any
  constructor(err: Error , showHelp?: () => string, parsing?: any) {
    this.err = err
    this.showHelp = showHelp ?? (() => '')
    this.parsing = parsing
  }
}
