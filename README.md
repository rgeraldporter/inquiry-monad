# Inquiry Monad
### v0.11.2

Experiment with aggregate Left/Right monad running parallel. More details when it is better fleshed out.

```
const subjectData = {
    a: 1,
    b: false
};

Inquiry.subject(subjectData)
    .informant(console.log)
    .inquire(hasA)
    .inquireP(retrieveAsyncC)
    .inquire(validateB)
    .conclude(x => handleFails(x), y => handlePasses(y));

// result: {subject: {a:1, b:false}, pass: Pass(), fail: Fail(), iou: IOU()}
```

Inquiry can take any value (a subject), store it within an immutable container (monad) to be tested against various functions (.inquire) and resulting in a two lists: `pass` and `fail`.

The advantage over Promises is that the original subject and each result is retained through the resulting chain of functions,
giving complete observability over the data passed through.

There are many advantages over a Left/Right or Validation pattern from functional. Inquiry aggregates all results, not just failures.

Inquiry can handle both syncrounous and asyncronous operations, although the rules change a bit when async is added.

Inquiry is designed to be an expressive, easily understood API.

Currently Promises are supported, but support for Futures is forthcoming.

### Constructor method:

`Inquiry.subject(theSubject)`

Returns an `Inquiry` monad, which is monad containing an object with properties `subject`, `pass`, `fail`, `iou`, and an `informant` method.

```
console.log(Inquiry.subject(theSubject).join()); // reveal contained value
// > {subject: theSubject, pass: Pass([]), fail: Fail([]), iou: IOU([]), informant: fn};
```

Note the constructor `Inquiry()` or `Inquiry.of()` can only be used if the above object type is adhered to. It should be avoided.

### Inquire

`.inquire(f)` : give inquire a function `f` that returns either a `Pass()` or `Fail()` value.
`.inquireP(f)` : give inquire a function `f` that returns a Promise that returns a `Pass()` or `Fail()` value.
 This will make your Inquiry an asyncronous operation.

### Interrogative methods:

`.inspect()` : return a string with the value contained in the Inquiry monad.
`.informant(f)`: call function `f` upon each `.inquire` result. Useful for logging or observing. The function will be passed an array
containing `['fnName', Pass('passed value')]` or `['fnName', Fail('failed value')]`.

### Standard monadic methods:

`ap`
`map`
`chain`
`join`

### Unwrap methods:

`conclude(f, g)` - returns the monad's container value, with map functions applied to both fail (`f`) and pass (`g`)
`fork` - exit and either run a function if there are any failures, or another if all have passes
`zip` - exit and return an merged list of passes and fails

Multi-map method:
`unison`

Flow-control method:
`swap`