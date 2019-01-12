; promise
(define (make-promise proc)
    (let ((result-ready? #f)
          (result #f))
      (lambda ()
        (if result-ready?
            result
            (let ((x (proc)))
              (if result-ready?
                  result
                  (begin (set! result-ready? #t)
                         (set! result x)
                         result)))))))

(define (force object)
  (object))

(define (list-tail x k)
  (if (zero? k)
      x
      (list-tail (cdr x) (- k 1))))