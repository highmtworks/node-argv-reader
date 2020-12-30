# argv-reader

Primitive commandline option processing library.


## Concept

* Prefer combination of libraries to one library covering all
* Focus on providing a building block of commandline option processing to implement the bahavior that developers hope to realize


## Getting Started

### Import

```
import { ArgvReader } from 'argv-reader'
```


### Parse flags

```
type RawOpts = {
  flags: {
    flag1?: boolean,
  },
}
const reader = new ArgvReader<unknown, RawOpts>(
  arg => {
    if (arg.startsWith('-')) {
      switch (arg) {
        case '-f': case '--flag1':
          return ['flag', 'flag1']
      }
    }
    return false
  },
  opts => opts as RawOpts,
)
const opts = reader.read(['-f'])
console.log(opts)
// -> { flags: { flag1: true } }
```

* Construct a reader by passing two arguments:
    - The first (`arg => ...`) is an extractor which receives each element and determines how to treat it.
    - The second (`opts => ...`)is an converter which receives the result from the reader and convert it to the firnal result.
* `reader.read()` reads elements from passed array one by one.
* The reader passes each element to the user supplied extractor function (`arg => ...` ) .
* The extractor determines if the passed element is a flag, and if so, returns `['flag', 'flag1']`.
    - The first return value `'flag'` indicates how to treat the passed element. in this case, treat it as a flag.
    - The second return value `'flag1'` indicates the name of a flag.
* The extractor returns `false` if the passed element is not a flag. This indicates it is interpreted as part of rest arguments (as seen later.)
* The reader interprets returned value from extractor and stores the result.
    - flags are stored in `flags.{{flag name}}`.
* After all elements are read, the reader passes the result to the user supplied converter function (`opts => ...`), which just returns the same as the final result here but casts it to the typed value.
* `reader.read()` returns the final result.


### Parse options which takes its argument

```
type RawOpts = {
  singles: {
    single1?: string,
  },
}
const reader = new ArgvReader<unknown, RawOpts>(
  arg => {
    if (arg.startsWith('-')) {
      switch (arg) {
        case '-s': case '--single':
          return ['single', 'single1']
      }
    }
    return false
  },
  opts => opts as RawOpts,
)
const opts = reader.read(['-s', 'a-value'])
console.log(opts)
// -> { singles: { single1: 'a-value' } }
```

* The extractor determines if the passed element is an option with a value, and if so, returns `['single', 'single1']`
    - `'single'` at the first position means to interpret it as a option with a value.
    - `'single1'` at the second position is the name of the option.
* After receiving the instruction from the extractor, the reader reads the next element (which is not passed to the extractor) and stores it as the value of the option.
    - The reader stores option values in `singles.{{option name}}`


### Parse rest arguments

```
type RawOpts = {
  rest: string[],
}
const reader = new ArgvReader<unknown, RawOpts>(
  arg => {
    return false
  },
  opts => opts as RawOpts,
)
const opts = reader.read(['a', 'b'])
console.log(opts)
// -> { rest: ['a', 'b'] }
```

* If the extractor returns `false`, the reader stores the read element in `rest` array.


### Put them together

```
type RawOpts = {
  flags: {
    flag1?: boolean,
  },
  singles: {
    single1?: string,
  },
  rest: string[],
}
const reader = new ArgvReader<unknown, RawOpts>(
  arg => {
    if (arg.startsWith('-')) {
      switch (arg) {
        case '-f': case '--flag1':
          return ['flag', 'flag1']
        case '-s': case '--single':
          return ['single', 'single1']
      }
    }
    return false
  },
  opts => opts as RawOpts,
)
const opts = reader.read(['-f', '-s', 'a-value', 'a', 'b'])
console.log(opts)
// -> {
//   flags: { flag1: true },
//   singles: { single1: 'a-value' },
//   rest: ['a', 'b'],
// }
```


### If unknown options are given

* How to do is dependent on expected behavior.
* If they should be treated as rest arguments,
  the above extractor is satisfactory.
* If error should be thrown,

  ```
  const reader = new ArgvReader<unknown, RawOpts>(
    arg => {
      if (arg.startsWith('-')) {
        switch (arg) {
          case '-f': case '--flag1':
            return ['flag', 'flag1']
          case '-s': case '--single':
            return ['single', 'single1']
        }
        // added the following line
        throw new Error(`unknown option: ${arg}`)
      }
      return false
    },
    opts => opts as RawOpts,
  )
  const opts = reader.read(['-h'])
  // -> Error: unknown option: -h
  ```


### Treat all arguments after '--' as rest arguments

* The extractor can return `'rest'` to show the elements after this marker are treated as rest arguments, which are not passed to the extractor any more.

  ```
  const reader = new ArgvReader<unknown, RawOpts>(
    arg => {
      if (arg.startsWith('-')) {
        // added the following lines
        if (arg === '--') {
          return 'rest'
        }
        switch (arg) {
          case '-f': case '--flag1':
            return ['flag', 'flag1']
          case '-s': case '--single':
            return ['single', 'single1']
        }
        throw new Error(`unknown option: ${arg}`)
      }
      return false
    },
    opts => opts as RawOpts,
  )
  const opts = reader.read(['--', '-h'])
  console.log(opts)
  // -> {
  //   rest: ['-h'],
  //  ...
  // }
  ```


### Treat concatenated short options as each separated option

* The extractor can return `'replace'` to replace the current element with alternative elements.

  ```
  type RawOpts = {
    flags: {
      flag1?: boolean,
    },
    // added the following lines
    multiflags: {
      verbose?: number,
    },
    singles: {
      single1?: string,
    },
    rest: string[],
  }
  const reader = new ArgvReader<unknown, RawOpts>(
    arg => {
      if (arg.startsWith('-')) {
        if (arg === '--') {
          return 'rest'
        }
        switch (arg) {
          case '-f': case '--flag1':
            return ['flag', 'flag1']
          case '-s': case '--single':
            return ['single', 'single1']
          // added the following lines
          case '-v':
            return ['multiflag', 'verbose']
        }
        // added the following lines
        if (/^-vv+$/.test(arg)) {
          const alt = arg.split('').slice(1).map(a => `-${a}`)
          return ['replace', alt]
        }
        throw new Error(`unknown option: ${arg}`)
      }
      return false
    },
    opts => opts as RawOpts,
  )
  const opts = reader.read(['-vvv'])
  console.log(opts)
  // -> {
  //   multiflags: { verbose: 3 },
  //   ...
  // }
  ```

    - `/^-vv+$/.test(arg)` tests if the current element is like `'-vvv'`.
    - `['replace', alt]` means to replace the current element with the sequence of elements that `alt` represents, and call the extractor again for the current element. So `['-vvv']` becomes `['-v', '-v', '-v']`.
    - `multiflag` counts appearance of a flag instead stores a flag value. The result is stored in `multiflags.{{flag name}}`.


### Treat an option that optionally takes an argument

* The extractor can look ahead the next element and determine if the current element should take the next element as its argument, or should not take the next element and take default value as its argument.

  ```
  const reader = new ArgvReader<unknown, RawOpts>(
    arg => {
      if (arg.startsWith('-')) {
        if (arg === '--') {
          return 'rest'
        }
        switch (arg) {
          case '-f': case '--flag1':
            return ['flag', 'flag1']
          case '-s': case '--single':
            // changed the following lines
            return ['lookahead', la => la == null || la.startsWith('-')
              ? ['replace', [arg, '']]
              : ['single', 'single1']]
        }
        throw new Error(`unknown option: ${arg}`)
      }
      return false
    },
    opts => opts as RawOpts,
  )
  const opts = reader.read(['-s', '-f'])
  console.log(opts)
  // -> {
  //   flags: { flag1: true },
  //   singles: { single1: '' },
  //   ...
  // }
  // , instead of
  // {
  //   flags: {},
  //   singles: { single1: '-f' },
  //   ...
  // }
  ```

    - `['lookahead', f]` instructs the reader to pass the next element to f, which returns the determined instruction for the current element to the reader.
    - `['replace', [arg, '']]` means to replace the current element with the sequence of `arg` and `''`, and call the extractor again for the current element. So `['-s', '-f']` becomes `['-s', '', '-f']`.


### Implement sub commands

* The implementation plan is as follows:
    - Implement a top level commandline option parser.  
      This stores the result of type
      `{ command: string, rest: string[]  }`
      where `command` represents the name of sub command and `rest` represents rest arguments which are fed to each sub command as its own arguments.
    - Implement commandline option parsers for each sub command.  
      This parses rest arguments of the top level parser.

* The top level parsr would be like this:

  ```
  type ParsingTopOpts = {
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
        throw new Error(`unknown option: ${arg}`)
      }
      if (state == null) {
        return ['argument', 'command', 'rest']
      }
      return false
    },
    opts => opts as ParsingTopOpts
  )
  const topOpts = reader.read(process.argv.slice(2))
  ```

  - The extractor recieves `state` as the second argument.
      - It is of type expressed by the first type parameter of `ArgvReader`. Here, `'rest'` (or exactly, `'rest' | undefined`).
      - It has `undefined` as an initial value.
  - The extractor can update `state` by returing new state value.  
      - The new state value is filled in the extra trailing element of the returned value array. Here, `'rest'` of `['argument', 'command', 'rest']`.
  - `['argument', 'rest']` means to treat the current element as the argument named `'rest'`.
      - At the second position is the name of the argument.
      - The reader stores the value of the named argument in `arguments.{{argument name}}` array of the result object.
      - Howver, the argument named `'rest'` is treated specially and stored in `rest` array instead of `arguments.rest` for the purpose of compatibility with normal rest arguments.
  - `['argument', 'command', 'rest']` means to treat the current element as the argument named `'command'` which is stored in `arguments.command`, and update the state to `'rest'`.
      - At the third position is the new state value desribed above.
  - In sum:
      - Until the extractor sees the first argument except for flags, `state` remains `null` and it parses flags normally.
      - If the extractor encounters an element that is not a flag for the first time, it treats that element as the argument named `'command'`, and update the state to `'rest'`.
      - The extractor continues to run in the state of `'rest'` and treats all remaining arguments as rest arguments.

* Then dispatch rest arguments to sub commands:

  ```
  switch (topOpts.command) {
    case 'command1': {
      const subreader = new ArgvReader // ...
      const subOpts = subreader.read(topOpts.rest)
      doSomethingOfSubCommmand1(topOpts, subOpts)
    }
    // ...
  }
  ```

## What this library does not provide

### Check if invalid values are given to options

* You can check if options have expected values by yourself.  
* It is not in the scope of this library.  
  It can be realized by combination of other libraries, which seems more flexible and preferrable.


### Show help

* You can write it by yourself independently from the commandline processing library:

  ```
  const help = `\
  usage: [options] [<arguments>]

  options:
    -f|--flag1		explanation of flag1
    -s|--single1 <single1>
          explanation of single1

  arguments:
    explanation of arguments
  `
  ```

* It is possible to provide separate libraries to generate help text from declared options information.  
  It seems more flexible and preferrable to users being enforced specific format by the commandline option processing library that they chose accidentally.


### Need declarative interface

* You can construct it by yourself on top of the commandline processing library.
    - for example, declare options information like:
      ```
      const options = {
        flags: {
          flag1: {
            short: '-f'
            long: '--flag1'
          }
        }
      }
      ```
    - then implement an extractor function using it:
      ```
      arg => {
        if (arg.startsWith('-')) {
          for (const optName of Object.keys(options.flags)) {
            if (arg === options.flags[optName].short ||
                arg === options.flags[optName].long) {
              return ['flag', optName]
            }
          }
          // ...
        }
        // ...
      }
      ```
* Again, it is possible to provide separate libraries like this and it seems more flexible and preferrable.


## Example

* More examples can be found in `examples` directory of the repository.
* Test cases in `tests` directory may also be useful.


## License
This library is licensed under the MIT License.
