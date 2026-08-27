// Minimal store-only (no compression) ZIP writer. Exists because asking a
// browser - Safari especially - to download 100 separate files mostly ends in
// silently dropped downloads. One zip, one click, everything comes out.

const te = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
  const u32 = (v: number) =>
    new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
  const cat = (...parts: Uint8Array[]) => {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  for (const f of files) {
    const name = te.encode(f.name);
    const crc = crc32(f.data);
    const local = cat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(name.length), u16(0), name,
    );
    chunks.push(local, f.data);
    central.push(cat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name,
    ));
    offset += local.length + f.data.length;
  }

  const centralStart = offset;
  const centralBytes = cat(...central);
  const eocd = cat(
    u32(0x06054b50), u16(0), u16(0),
    u16(files.length), u16(files.length),
    u32(centralBytes.length), u32(centralStart), u16(0),
  );

  return new Blob([...chunks, centralBytes, eocd].map((c) => c.slice().buffer as ArrayBuffer), {
    type: 'application/zip',
  });
}
