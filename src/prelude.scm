; let let* letrec
(define-syntax begin
  (syntax-rules ()
    ((begin expression) expression)
    ((begin expression expressions ...)
     ((lambda (ignored) (begin expressions ...)) expression))))

(define-syntax do
  (syntax-rules ()
    ((do ((var init step ...) ...)
         (test expr ...)
         command ...)
     (letrec
       ((loop
         (lambda (var ...)
           (if test
               (begin
                 (if #f #f)
                 expr ...)
               (begin
                 command
                 ...
                 (loop (do "step" var step ...)
                       ...))))))
       (loop init ...)))
    ((do "step" x)
     x)
    ((do "step" x y)
     y)))

(define-syntax let
  (syntax-rules ()
    ((_ ((x v) ...) e1 e2 ...)
     ((lambda (x ...) e1 e2 ...) v ...))
    ((_ name ((x v) ...) e1 e2 ...)
     (let*
       ((f  (lambda (name)
              (lambda (x ...) e1 e2 ...)))
        (ff ((lambda (proc) (f (lambda (x ...) ((proc proc)
               x ...))))
             (lambda (proc) (f (lambda (x ...) ((proc proc)
               x ...)))))))
        (ff v ...)))))

(define-syntax let*
  (syntax-rules ()
    ((let* () body1 body2 ...)
     (let () body1 body2 ...))
    ((let* ((name1 val1) (name2 val2) ...)
       body1 body2 ...)
     (let ((name1 val1))
       (let* ((name2 val2) ...)
         body1 body2 ...)))))


(define-syntax letrec
    (syntax-rules ()
      ((letrec ((var1 init1) ...) body ...)
       (letrec "generate_temp_names"
         (var1 ...)
         ()
         ((var1 init1) ...)
         body ...))
      ((letrec "generate_temp_names"
         ()
         (temp1 ...)
         ((var1 init1) ...)
         body ...)                        
       (let ((var1 #f) ...)
         (let ((temp1 init1) ...)
           (set! var1 temp1)
           ...
           body ...)))
      ((letrec "generate_temp_names"
         (x y ...)
         (temp ...)
         ((var1 init1) ...)
         body ...)
       (letrec "generate_temp_names"
         (y ...)
         (newtemp temp ...)
         ((var1 init1) ...)
         body ...))))

; conditionals

(define-syntax and
  (syntax-rules ()
    ((and) #t)
    ((and test) test)
    ((and test1 test2 ...)
     (if test1 (and test2 ...) #f))))

(define-syntax or
  (syntax-rules ()
    ((or) #f)
    ((or test) test)
    ((or test1 test2 ...)
     (let ((x test1))
       (if x x (or test2 ...))))))


(define-syntax case
  (syntax-rules (else =>)
    ((case (key ...)
       clauses ...)
     (let ((atom-key (key ...)))
       (case atom-key clauses ...)))
    ((case key
       (else => result))
     (result key))
    ((case key
       (else result1 result2 ...))
     (if #t ((lambda () result1 result2 ...))))
    ((case key
       ((atoms ...) result1 result2 ...))
     (if (memv key '(atoms ...))
         ((lambda () result1 result2 ...))))
    ((case key
       ((atoms ...) => result)
       clause clauses ...)
     (if (memv key '(atoms ...))
         (result key)
         (case key clause clauses ...)))
    ((case key
       ((atoms ...) result1 result2 ...)
       clause clauses ...)
     (if (memv key '(atoms ...))
         ((lambda () result1 result2 ...))
         (case key clause clauses ...)))))

(define-syntax cond
  (syntax-rules (else =>)
    ((cond (else result1 result2 ...))
     ((lambda () result1 result2 ...)))
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
     (let ((temp test))
       (if temp
           temp
           (cond clause1 clause2 ...))))
    ((cond (test result1 result2 ...))
     (if test ((lambda () result1 result2 ...))))
    ((cond (test result1 result2 ...)
           clause1 clause2 ...)
     (if test
         ((lambda () result1 result2 ...))
         (cond clause1 clause2 ...)))))


; Lazy evaluaztion spec
(define force
    (lambda (object)
        (object)))

(define-syntax delay 
  (syntax-rules () 
    ((delay expression)
     (make-promise (lambda () expression)))))

(define make-promise
  (lambda (proc)
    (let ((result-ready? #f)
          (result #f))
      (lambda ()
        (if result-ready? 
            result
            (let ((x (proc)))
              (if result-ready?
                  result
                  (begin (set! result x)
                         (set! result-ready? #t)
                         result))))))))

(define (not x)      (if x #f #t))
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

(define (eqv? x y)
  (or (eq? x y)
      (if (and (number? x) (number? y))
          (= x y)
          #f)))

(define (equal? x y)
  (cond ((and (pair? x) (pair? y))
         (and (equal? (car x) (car y))
              (equal? (cdr x) (cdr y))))
        ((and (string? x) (string? y))
         (string=? x y))
        ((and (vector? x) (vector? y)
              (= (vector-length x) (vector-length y)))
         (let lp ((i (- (vector-length x) 1)))
           (cond ((= i -1) #t)
                 ((not (equal? (vector-ref x i) (vector-ref y i)))
                  #f)
                 (else (lp (- i 1)))))
         )
        (else (eqv? x y))))

(define (foldr func end lst)
  (if (null? lst)
    end
    (func (car lst) (foldr func end (cdr lst)))))

(define (foldl func accum lst)
  (if (null? lst)
    accum
    (foldl func (func (car lst) accum) (cdr lst))))

(define (zero? x) (= x 0))
(define (positive? x) (>= x 0))
(define (negative? x) (< x 0))
(define (even? x) (= (% x 2) 0))
(define (odd? x) (not (even? x)))
(define (max first . rest) (foldl (lambda (old new) (if (> old new) old new)) first rest))
(define (min first . rest) (foldl (lambda (old new) (if (< old new) old new)) first rest))
(define (abs x)
  (if (negative? x)
      (- x)
      x))
(define (length lst)    (foldl (lambda (x y) (+ y 1)) 0 lst))
(define (list . x) x)

(define (append . lists)
  (if (pair? lists)
      (let recur ((list1 (car lists)) (lists (cdr lists)))
        (if (pair? lists)
            (let ((tail (recur (car lists) (cdr lists))))
              (foldr cons tail list1))
            list1))
      '()))

(define (reverse l)
  (let lp ((l l) (ret '()))
    (if (null? l)
        ret
        (lp (cdr l) (cons (car l) ret)))))

(define (list-tail x k)
  (if (zero? k)
      x
      (list-tail (cdr x) (- k 1))))

(define (list-ref x k)
  (if (zero? k)
      (car x)
      (list-ref (cdr x) (- k 1))))

(define (string=? x y)
  (and (= (string-length x) (string-length y))
       (let lp ((i (- (string-length x) 1)))
         (cond ((= i -1) #t)
               ((not (char=? (string-ref x i) (string-ref y i)))
                #f)
               (else (lp (- i 1)))))))
