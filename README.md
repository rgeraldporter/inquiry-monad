# Inquiry Monad
### v0.4.0

Experiment with aggregate Left/Right monad running parallel. More details when it is better fleshed out.

```
const subject = {
    a: 1,
    b: false
};

Inquiry.of(subject)
    .informant(console.log)
    .inquire(hasA)
    .inquire(retrieveC)
    .inquire(validateB)
    .cohort(x => handleFails(x), y => handlePasses(y));

// result: {subject: {a:1, b:false}, pass: Pass(), fail: Fail()}
```

Interrogative methods:

`inspect`
`informant`

Standard monadic methods:

`ap`
`map`
`chain`

Unwrap methods:

`cohort` - run functions for both Pass and Fail
`join` - exit and return values of the subject, pass, fail
`fork` - exit and either run a function if there are any failures, or another if all have passes
`fold` - same as fork, opposite order
`zip` - exit and return an merged list of passes and fails

Multi-map method:
`unison`

Flow-control method:
`swap`