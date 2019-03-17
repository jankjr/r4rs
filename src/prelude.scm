; let let* letrec
(define-syntax begin
  (syntax-rules ()
    ((begin expression) expression)
    ((begin expression expressions ...)
     ((lambda (ignored) (begin expressions ...)) expression))))

(define-syntax let
  (syntax-rules ()
    ((let ((var val) ...) body ...)
      ((lambda (var ...) body ...) val ...))))

(define-syntax let*
  (syntax-rules ()
    (
      (let* () body ...)
      (lambda () body ...)
    )
    (
      (let* ((name1 val1) rest ...) body1 body2 ...)
      (let ((name1 val1)) (let* (rest ...) body1 body2 ...))
    )
  )
)

(define-syntax letrec 
   (syntax-rules () 
     ((letrec ((var init) ...) . body) 
      (let ((var 'undefined) ...) 
        (let ((var (let ((temp init)) (lambda () (set! var temp)))) 
              ... 
              (bod (lambda () . body))) 
          (var) ... (bod))))))

; conditionals

(define-syntax and
  (syntax-rules ()
    (
      (and)
      #t
    )
    (
      (and exp)
      (let ((test exp))
        (if test test #f)
      )
    )
    (
      (and exp1 exps ...)
      (if exp1
        (and exps ...)
        #f
      )
    )
  )
)
(define-syntax or
  (syntax-rules ()
    (
      (or)
      #t
    )
    (
      (or exp)
      (let ((test exp))
        (if test test #f)
      )
    )
    (
      (or exp1 exps ...)
      (let ((test exp1))
        (if test test (or exps ...))
      )
    )
  )
)

(define-syntax cond
  (syntax-rules (else =>)
    ((cond (else result1 result2 ...))
     (begin result1 result2 ...))
    ((cond (test => result))
     (let ((temp test))
       (if temp (result temp))))
    ((cond (test => result) clause1 clause2 ...)
     (let ((temp test))
       (if temp
           (result temp)
           (cond clause1 clause2 ...))))
    ((cond (test)) test)
    ((cond (test) clause1 clause2 ...)
     (or test (cond clause1 clause2 ...)))
    ((cond (test result1 result2 ...))
     (if test (begin result1 result2 ...)))
    ((cond (test result1 result2 ...)
           clause1 clause2 ...)
     (if test
         (begin result1 result2 ...)
         (cond clause1 clause2 ...)))))


; Lazy evaluaztion spec
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
(define-syntax delay
  (syntax-rules ()
    (
      (delay exp)
      (make-promise (lambda () exp))
    )
  )
)
(define (force object) (object))

; car/cdr

(define (caar x) (car (car x)))
(define (cadr x) (car (cdr x)))
(define (cdar x) (cdr (car x)))
(define (cddr x) (cdr (cdr x)))

; three
(define (caaar x) (car (car (car x))))
(define (caadr x) (car (car (cdr x))))
(define (cadar x) (car (cdr (car x))))
(define (caddr x) (car (cdr (cdr x))))
(define (cdaar x) (cdr (car (car x))))
(define (cdadr x) (cdr (car (cdr x))))
(define (cddar x) (cdr (cdr (car x))))
(define (cdddr x) (cdr (cdr (cdr x))))

; four
(define (caaaar x) (car (car (car (car x)))))
(define (caaadr x) (car (car (car (cdr x)))))
(define (caadar x) (car (car (cdr (car x)))))
(define (caaddr x) (car (car (cdr (cdr x)))))
(define (cadaar x) (car (cdr (car (car x)))))
(define (cadadr x) (car (cdr (car (cdr x)))))
(define (caddar x) (car (cdr (cdr (car x)))))
(define (cadddr x) (car (cdr (cdr (cdr x)))))
(define (cdaaar x) (cdr (car (car (car x)))))
(define (cdaadr x) (cdr (car (car (cdr x)))))
(define (cdadar x) (cdr (car (cdr (car x)))))
(define (cdaddr x) (cdr (car (cdr (cdr x)))))
(define (cddaar x) (cdr (cdr (car (car x)))))
(define (cddadr x) (cdr (cdr (car (cdr x)))))
(define (cdddar x) (cdr (cdr (cdr (car x)))))
(define (cddddr x) (cdr (cdr (cdr (cdr x)))))


(define (zero? x) (= x 0))
(define (positive? x) (>= x 0))
(define (negative? x) (< x 0))
(define (even? x) (= (% x 2) 0))
(define (odd? x) (not (even? x)))

