
(define (test exp expecting)
  (let ((result (eval exp)))
    (if (not (equal? result expecting))
      (begin
        (display "FAIL: ")
        (display exp)
        (display " = ")
        (display result)
        (display " expected ")
        (display expecting)
        (display "\n")))))

(define pass-count 0)
(define fail-count 0)

(define (assert/equal actual expected . label)
     (begin
       (if (not (equal? expected actual))
          (begin 
              (display "Test ")
              (display "failed; expected value: [")
              (display expected) 
              (display "], actual value: [") 
              (display actual)
              (display "]")))
       (set! pass-count (+ pass-count 1))))

(test '(car '(a b)) 'a)
(test '(cdr '(a b)) '(b))
(test '(pair? '(a . b))  #t)
(test '(pair? '(a b c))  #t)
(test '(pair? '())       #f)
(test '(pair? '#(a b))   #t)
(test '(append '(x) '(y))       '(x y))
(test '(append '(a) '(b c d))   '(a b c d))
(test '(append '(a (b)) '((c))) '(a (b) (c)))
(test '(reverse '(a b c))                     '(c b a))
(test '(reverse '(a (b c) d (e (f))))         '((e (f)) d (b c) a))

(test '(memq 'a '(a b c))                     '(a b c))
(test '(memq 'b '(a b c))                     '(b c))
(test '(memq 'a '(b c d))                     '#f)
(test '(memq (list 'a) '(b (a) c))            '#f)
(test '(member (list 'a) '(b (a) c))          '((a) c))
(test '(memv 101 '(100 101 102))              '(101 102))
(test '(list-ref '(100 101 102) 1)              101)
(test '(list-ref '(100 101 102) 1)              101)

(test '(min 0 1)             0)
(test '(min 0 1)             0)
(test '(min 3 2 1)           1)
(test '(max 0 1)             1)
(test '(max 1 0)             1)


(define x 28)
(assert/equal x 28)

(assert/equal '#(a b c) '#(a b c))
(assert/equal '() '())
(assert/equal '(+ 1 2) '(+ 1 2))
(assert/equal '(quote a) '(quote a))

(assert/equal '"abc"  "abc")
(assert/equal '145932 145932)
(assert/equal '#t  #t)

(assert/equal (+ 3 4)  
              7)
(assert/equal ((if #f + *) 3 4)  
              12)

(assert/equal ((lambda (x) (+ x x)) 4)  8)

(define reverse-subtract
    (lambda (x y) (- y x)))
(assert/equal (reverse-subtract 7 10)  3)

(define add4
    (let ((x 4))
          (lambda (y) (+ x y))))
(assert/equal (add4 6)  10)

(assert/equal (if (> 3 2) 'yes 'no)   'yes)
(assert/equal (if (> 2 3) 'yes 'no)   'no)
(assert/equal (if (> 3 2)
                  (- 3 2)
                  (+ 3 2))
              1)

(define x 2)
(assert/equal (+ x 1)  3)
(set! x 4)
(assert/equal (+ x 1) 5)

(define x (list 'a 'b 'c))
(define y x)
(assert/equal y '(a b c))

(assert/equal (list? y)  
              #t)
(set-cdr! x 4)

(assert/equal x 
              '(a . 4))

(define f '(1 2 3 4))
(set-car! f 8)
(assert/equal f '(8 2 3 4))

(define f '(1 . 2))
(set-car! f "a")
(assert/equal f '("a" . 2))

(set-cdr! x x)
(assert/equal (list? x)  #f)

(assert/equal (pair? (list 1 2 3)) #t)
(assert/equal (pair? 1) #f)
(assert/equal (pair? '(a . b)) #t)
(assert/equal (pair? '(a b c)) #t)
(assert/equal (pair? '()) #f)

(assert/equal (pair? '#(a b)) #t)

(assert/equal (cons 'a '())            '(a))
(assert/equal (cons '(a) '(b c d))     '((a) b c d))
(assert/equal (cons "a" '(b c))        '("a" b c))
(assert/equal (cons 'a 3)              '(a . 3))
(assert/equal (cons '(a b) 'c)         '((a b) . c))
(assert/equal (car '(a b c))           'a)
(assert/equal (car '((a) b c d))       '(a))
(assert/equal (car '(1 . 2))           1)
(assert/equal (cdr '((a) b c d))       '(b c d))
(assert/equal (cdr '(1 . 2))           2)

(assert/equal (list? '(a b c))          #t)
(assert/equal (list? '())               #t)
(assert/equal (list? '(a . b))          #f)

(assert/equal (list 'a (+ 3 4) 'c)               '(a 7 c))
(assert/equal (list)                             '())

(assert/equal (length '(a b c))                  3)
(assert/equal (length '(a (b) (c d e)))          3)
(assert/equal (length '())                       0)

(assert/equal (append '(x) '(y))                 '(x y))
(assert/equal (append '(a) '(b c d))             '(a b c d))
(assert/equal (append '(a (b)) '((c)))           '(a (b) (c)))
(assert/equal (append '(a b) '(c . d))           '(a b c . d))
(assert/equal (append '() 'a)                    'a)
(assert/equal (append)                           '())
(assert/equal (append 'x)                        'x)
(assert/equal (append '(1) '(2))                 '(1 2))
(assert/equal (append '(1 2) '(3 4))             '(1 2 3 4))
(assert/equal (append '(1 2) '(3 4) '(5 6 7))    '(1 2 3 4 5 6 7))
(assert/equal (append '(1 2) '(3 4) '(5 6 7) '(8 9 10 11 12 13 14) '(15)) '(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15))

(assert/equal (reverse '(a b c))                 '(c b a))
(assert/equal (reverse '(a (b c) d (e (f))))  
                                                  '((e (f)) d (b c) a))

(assert/equal (list-ref '(a b c d) 2)     'c)
; (assert/equal (list-ref '(a b c d)
;                 (inexact->exact (round 1.8))) 
;               'c)

(assert/equal (symbol? 'foo)                  #t)
(assert/equal (symbol? (car '(a b)))          #t)
(assert/equal (symbol? "bar")                 #f)
(assert/equal (symbol? 'nil)                  #t)
(assert/equal (symbol? '())                   #f)
(assert/equal (symbol? #f)                    #f)


(assert/equal (symbol->string 'flying-fish)     
               "flying-fish")
(assert/equal (symbol->string 'Martin) 
              "Martin")
(assert/equal (symbol->string
                 (string->symbol "Malvina"))
              "Malvina")
(assert/equal (eq? 'mISSISSIppi 'mississippi)  
                #f)
(assert/equal (string->symbol "mISSISSIppi")  
                'mISSISSIppi)
(assert/equal (eq? 'bitBlt (string->symbol "bitBlt"))     
               #t)
(assert/equal (eq? 'JollyWog
          (string->symbol
                   (symbol->string 'JollyWog)))  
                #t)
(assert/equal (string=? "K. Harper, M.D."
                 (symbol->string
                 (string->symbol "K. Harper, M.D.")))  
                 #t)

(assert/equal (string->vector "ABC")
             #(#\A #\B #\C))
(assert/equal (vector->string #(#\1 #\2 #\3))
              "123")

(assert/equal (and (= 2 2) (> 2 1))   #t)
(assert/equal (and (= 2 2) (< 2 1))   #f)
(assert/equal (and 1 2 'c '(f g))     '(f g))
(assert/equal (and)                   #t)

(assert/equal (or (= 2 2) (> 2 1))   #t)
(assert/equal (or (= 2 2) (< 2 1))   #t)
(assert/equal (or #f #f #f)          #f)
(assert/equal (or (memq 'b '(a b c)) 
                  (/ 3 1)) 
              '(b c))

(assert/equal 
    (let ((x 2) (y 3))
          (* x y))
    6)

(assert/equal 
(let ((x 2) (y 3))
    (let ((x 7)
                  (z (+ x y)))
          (* z x))) 
 35)

(assert/equal 
(let ((x 2) (y 3))
    (let* ((x 7)
                    (z (+ x y)))
          (* z x)))
 70)


(define add3
    (lambda (x) (+ x 3)))
(assert/equal (add3 3)
               6)
(define first car)
(assert/equal (first '(1 2))
              1)
(assert/equal
  (let ((x 5))
    (define bar #f) ; Only needed for compiled code
    (define foo (lambda (y) (bar x y)))
    (define bar (lambda (a b) (+ (* a b) a)))
    (foo (+ x 3)))
  45)
