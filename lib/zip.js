'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ZIP WRITER - the smallest thing that can produce a real .zip, no dependency.
//
//  WHY NOT A LIBRARY
//  A Common Cartridge is a zip and nothing else, and the two candidates
//  (archiver, jszip) both pull a dependency tree and a streaming API for a job
//  that is one deflate call and three fixed-layout headers. This box is 1 vCPU
//  and 1 GB with a $169 memory-spike already in its history, so a package built
//  entirely in memory from an array of small strings is the shape that fits.
//  Everything here is synchronous and bounded by the entry list it is handed.
//
//  WHAT IT DOES NOT DO
//  No zip64, no encryption, no directory entries, no streaming. A course
//  package is a few hundred KB across a few hundred files, which is three
//  orders of magnitude inside every zip32 limit. A caller that ever needs more
//  should reach for a library rather than grow this.
//
//  DETERMINISM IS A FEATURE, NOT AN ACCIDENT
//  Every entry is stamped with the same fixed DOS timestamp unless a caller
//  says otherwise, so building the same course twice produces byte-identical
//  bytes. That is what lets a smoke suite assert on an md5 and what stops a
//  teacher who re-downloads from getting a file that differs only in noise.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const zlib = require('zlib');

// Standard CRC-32 (the one zip uses), table built once at module load.
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// The zip epoch is 1980, and a DOS timestamp has no room for anything earlier.
// This is the default stamp: fixed, so output is reproducible.
const DOS_EPOCH = { date: 0x0021, time: 0x0000 }; // 1980-01-01 00:00:00

function dosStamp(d) {
  if (!d) return DOS_EPOCH;
  const year = d.getUTCFullYear();
  if (year < 1980) return DOS_EPOCH;
  return {
    date: ((year - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
    time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1),
  };
}

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
// Bit 11: the name and comment are UTF-8. Every name we write is ASCII, but the
// flag costs two bytes and removes a whole class of "why is that file called
// that" report from a teacher on a non-English Windows.
const FLAG_UTF8 = 0x0800;

// Deflate, unless deflating made it bigger. Small XML files can grow by a few
// bytes under deflate, and a stored entry reads faster on the other end.
function compress(raw) {
  if (raw.length === 0) return { method: METHOD_STORE, body: raw };
  const deflated = zlib.deflateRawSync(raw, { level: 9 });
  return deflated.length < raw.length
    ? { method: METHOD_DEFLATE, body: deflated }
    : { method: METHOD_STORE, body: raw };
}

// entries: [{ name, data }] where data is a Buffer or a string (utf8).
// Returns one Buffer holding the whole archive.
function zipSync(entries, opts) {
  const stamp = dosStamp(opts && opts.mtime);
  const local = [];
  const central = [];
  let offset = 0;
  const seen = new Set();

  for (const e of entries) {
    const name = String(e.name).replace(/^\/+/, '');
    if (!name) throw new Error('zip: entry with an empty name');
    // A duplicate name is an archive where one file silently wins. That is a
    // missing assignment nobody would be able to explain, so it is an error.
    if (seen.has(name)) throw new Error(`zip: duplicate entry ${name}`);
    seen.add(name);

    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8');
    const { method, body } = compress(raw);
    const crc = crc32(raw);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);   // local file header signature
    lh.writeUInt16LE(20, 4);           // version needed to extract (2.0)
    lh.writeUInt16LE(FLAG_UTF8, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(stamp.time, 10);
    lh.writeUInt16LE(stamp.date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);           // no extra field
    local.push(lh, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);   // central directory header signature
    cd.writeUInt16LE(20, 4);           // version made by
    cd.writeUInt16LE(20, 6);           // version needed
    cd.writeUInt16LE(FLAG_UTF8, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(stamp.time, 12);
    cd.writeUInt16LE(stamp.date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);           // extra length
    cd.writeUInt16LE(0, 32);           // comment length
    cd.writeUInt16LE(0, 34);           // disk number start
    cd.writeUInt16LE(0, 36);           // internal attributes
    cd.writeUInt32LE(0, 38);           // external attributes
    cd.writeUInt32LE(offset, 42);      // offset of local header
    central.push(cd, nameBuf);

    offset += lh.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);   // end of central directory signature
  eocd.writeUInt16LE(0, 4);            // this disk
  eocd.writeUInt16LE(0, 6);            // disk with central directory
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);           // no archive comment

  return Buffer.concat([Buffer.concat(local), centralBuf, eocd]);
}

module.exports = { zipSync, crc32 };
