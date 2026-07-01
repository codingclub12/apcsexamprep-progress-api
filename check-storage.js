const db = require('./db');

const result = db.prepare(`
  SELECT unit, lesson, activity_type, COUNT(*) AS n
  FROM progress
  WHERE activity_type IN ('case-file','exam')
  GROUP BY unit, lesson, activity_type
`).all();

console.table(result);
process.exit(0);
