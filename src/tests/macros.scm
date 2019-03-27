
(define (test exp expecting)
  (let ((result (eval exp)))
    (if (not (equal? result expecting))
      (begin
        (display "FAIL: ")
        (display exp)
        (display " = ")
        (display expecting)
        (display " expected ")
        (display result)
        (display "\n")))))

(define v 1)
(define-syntax test-template
 (syntax-rules (v)
   ((_)
    v)))

(test '(test-template) 1)

(test '(let ((x 41) (y 1)) (+ x y)) 42)
(test '(let () (+ 1 2) (+ 1 1)) 2)
(test '(let ((x 1) (y 2) (z 3)) (+ x y z)) 6)
(test '(let ((x 11) (y 22) (z 34)) (+ x y z)) 67)
(test '(let ((x (* 1 2 3 4)) (y 22) (z 34)) (+ x y z)) (+ 24 22 34))
(test '(let* () 1) 1)
(test '(let* ((x 1)) x) 1)
(test '(let* ((x 1) (y x)) (+ x y)) 2)
(test '(let* ((x 1)
                                (y x)
                                (z (+ x y))) (* x y z)) (* 1 1 2))
(test '(letrec ((even?
          (lambda (n)
            (if (zero? n)
                #t
                (odd? (- n 1)))))
         (odd?
          (lambda (n)
            (if (zero? n)
                #f
                (even? (- n 1))))))
   (even? 88))
  #t)

(test '(letrec ((even?
          (lambda (n)
            (if (zero? n)
                #t
                (odd? (- n 1)))))
         (odd?
          (lambda (n)
            (if (zero? n)
                #f
                (even? (- n 1))))))
   (odd? 88))
  #f)
(define-syntax when
  (syntax-rules ()
    ((_ pred b1 ...)
     (if pred (begin b1 ...) ()))))

(test '(when #t 1 2 3) 3)
(test '(when #f 1 2 3) ())


(define-syntax swap!
  (syntax-rules ()
    ((_ a b)
     (let ((temp a))
       (set! a b)
       (set! b temp)))))


(test
  '(let ((a 42)
         (b 21))
    (swap! a b)
    a)
21)

;; case

(test '(case (* 2 3) ((2 3 5 7) 'prime) ((1 4 6 8 9) 'composite))
              'composite)

(test '(case (car '(c d))
                ((a e i o u) 'vowel)
                ((w y) 'semivowel)
                (else 'consonant))
              'consonant)

(test '(case (* 2 3) ((6) '(#t)) (else #f)) 
              '(#t))

(test '(case (* 2 3) ((6) '(#t)) (else #f))
              '(#t))

(test '(case (* 2 3) ((6) 6) (else #f))
              6)

(test '(case (* 2 3) ((8 9 10 2 3 4 5 1 3 6) #t) (else #f))
              #t)

(test '(case (* 2 3) ((4) #f) (else '(#t)))
              '(#t))

(test '(case (* 2 3) ((4 5 7 9 4 2 10) #f) (else '(#t)))
              '(#t))

(test '(case (* 2 3) (else #t))
              #t)

(test '(case 1 (() 'test) (else 'pass))
              'pass)

(test
    '(case (car '(c d))
        ((a e i o u) 'vowel)
        ((w y) 'semivowel)
        (else => (lambda (x) x)))
    'c)

(test '(cond ((> 3 2) 'greater) ((< 3 2) 'less))
              'greater)
(test '(cond ((> 3 3) 'greater) ((< 3 3) 'less) (else 'equal))
              'equal)

(test '(cond ((assv 'b '((a 1) (b 2))) => cadr)
                    (else #f))
              2)

(test '(let ((=> #f)) (cond (#t => (lambda (x) 'ok)))) 'ok)

