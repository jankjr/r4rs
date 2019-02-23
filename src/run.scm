(define (Vector x y z)
  (lambda (cmd . args)
    (cond
      ((eq? cmd 'x) x)
      ((eq? cmd 'setX) x)
      ((eq? cmd 'y) y)
      ((eq? cmd 'z) z)
      ((eq? cmd 'sum) (+ x y z))
      (else 'error)
    )
  )
)

(define v (Vector 1 2 3))

(display (v 'x))
(display (v 'sum))