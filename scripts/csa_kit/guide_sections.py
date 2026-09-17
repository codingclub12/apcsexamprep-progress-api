"""
The two schedule rows every teacher guide opens and closes a day with, and which
printed over nothing until 2026-09-17.

WHY THEY LIVE HERE RATHER THAN IN EITHER BUILDER
Unit 1 and Units 2-4 are built by two different scripts and both print these two
rows. A string duplicated across two builders is a drift waiting to happen: the
first wording fix lands in one of them and the two halves of one bundle start
telling a teacher different things about the same folder. One definition, two
importers.

Both notes name a file that is really in the lesson folder. That is the whole
reason these rows are filled rather than deleted: the guided-notes packet and
the exit ticket both exist, so a heading that points at one is doing a teacher a
service, while a heading over blank space is a promise of a section they then do
not get.
"""

OBJECTIVES_NOTE = (
    'The objectives above, and the guided-notes packet for this day, '
    'Guided_Notes/Day{day}_Notes_STUDENT.docx in this lesson folder. The KEY '
    'alongside it has the same pages filled in.')

EXIT_NOTE = (
    '{n} items, with the answers and a short why for each in the Exit ticket '
    'section at the end of this guide. Do not hand that page to students.')
