# A R4RS scheme implementation written in javascript

This is simply me attempting to implement a language spec.

I choose the r4rs as the spec is relatively simple.

This is not meant to be used in production.

# Usage

```
$ node src/eval.js
> 2
2
> "hello"
"hello"
> (define
  (fact n)
    (begin
      (define (factAcc n acc)
        (if (= n 0)
          acc
          (factAcc (- n 1) (* acc n))))
      (factAcc n 1)))
(undefined)
> (fact 0)
1
> (fact 10)
3628800
>
```
# features
  1. call/cc
  2. quasiquotes
  3. base extended forms let, let*, letrec etc..
  4. Hygenic Macros

# Todo
  1. Remainder of the standard standard lib
  2. Proper number tower
  3. Tail calls
  4. bytecode compilation