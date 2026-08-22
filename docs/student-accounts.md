# One account, every course

Read this before touching sign-in, `/join`, or anything that decides which
classes a student can reach.

## The shape

A `students` row is per class and stays that way. A student taking CSA and
Cyber genuinely has two rosters, two sets of progress, and two teachers, and
collapsing that would break the gradebook rather than fix the login.

What was missing was the thing ABOVE those rows. `student_accounts` is it:

```
student_accounts   id, name_key, pin_hash, created_at, last_active
students.account_id -> student_accounts.id      (nullable, additive)
```

The identity is **(name, PIN)**, because that is already what a student is asked
to remember. Same name and same PIN means the same person. A different PIN under
the same name means a different person, which is why `name_key` is deliberately
NOT unique: the second Avery in the district is a real student, not a conflict.

## The rules

1. **Same name and PIN reaches every course on the account.** `POST /login` with
   any of the student's class codes returns their whole enrollment list;
   `POST /switch` trades that token for one scoped to another of their classes
   with no PIN retype, because nothing new is being proved.

2. **A name and PIN cannot belong to two people.** `POST /join` refuses
   (`409 name_pin_taken`) when the pair already answers to an account, and asks
   for a different name or PIN. The refusal names nothing about the other
   account: not the class, not the course, not whether it is even the same
   person.

   This is the one place the two features pull against each other, and the tie
   goes to refusing. `/join` cannot tell "the same kid adding a course" from "a
   different kid who picked the same four digits", and quietly merging the second
   case puts two students in one gradebook with no error anywhere. The first case
   has a door that does not require guessing, which is rule 3.

3. **A student who already has an account adds classes from inside it.**
   `POST /enroll` with a class code copies the existing name and PIN hash onto a
   new row in the target class. No name, no PIN, no second account. The join page
   offers this directly off the rule-2 refusal ("sign in and we will add this
   class for you").

4. **Names stay unique WITHIN a class.** That is the teacher's roster, and two
   students called Avery on it is a roster problem, not a login problem.
   `/enroll` refuses with `name_taken_in_class` and says to ask the teacher.

## Why the link is lazy

Every row written before accounts existed starts with `account_id` NULL and is
linked on its owner's next successful sign-in. A backfill would have to decide
whether the Avery in `CSA-2K4P` and the Avery in `CYBER-9QRS` are one student,
and the only evidence either way is a hash it cannot read. Linking at sign-in
makes that decision with the PIN in hand.

`GET /enrollments` and `POST /switch` will also link the CURRENT row on first
read, using the hash already on it. That groups a student's own classes without a
PIN; it can never pull in a stranger's row, because a stranger's row carries a
different hash and is only ever attached by a verified sign-in.

## Cost

bcrypt at cost 10 is deliberately slow and this runs on one Railway vCPU, so the
candidate set is bounded: only accounts sharing the exact folded name are
compared, capped at `MAX_PIN_CANDIDATES` (8), ordered most-recently-active first
so the cap lands on abandoned accounts. It runs on join and on the one sign-in
that first links a row, never on a read path.

## PII

Nothing new about a minor is stored. An account row is a folded name and a bcrypt
hash, which is exactly what the `students` table already held.

## Endpoints

| Route | Auth | Does |
| --- | --- | --- |
| `POST /api/student/join` | none | First signup. Refuses a taken name+PIN. |
| `POST /api/student/login` | none | Sign in, link the account, return enrollments. |
| `GET /api/student/enrollments` | student | Every class this identity reaches. |
| `POST /api/student/switch` | student | Token for another of your own classes. |
| `POST /api/student/enroll` | student | Add a class under the same name and PIN. |

Covered end to end by `npm run smoke:accounts` (`smoke/student-accounts.js`),
including the two silent failure modes: merging two different students, and
minting a token for a class that is not yours.
