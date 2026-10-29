const col = db.getSiblingDB("lab03_indexing").test_sparse;
const out = { buoc: "Buoc 6 - sparse", mongodVersion: db.version() };

function dsStage(p) {
  p = (p && p.queryPlan) ? p.queryPlan : p;
  const s = [];
  while (p) {
    s.push(p.stage + (p.indexName ? "(" + p.indexName + ")" : ""));
    p = p.inputStage || (p.inputStages && p.inputStages[0]);
  }
  return s.join(" <- ");
}
function dem(ten, filter, hint) {
  let cur = col.find(filter);
  if (hint) cur = cur.hint(hint);
  const ds = cur.sort({ _id: 1 }).toArray();
  let ex = col.find(filter);
  if (hint) ex = ex.hint(hint);
  const e = ex.explain("executionStats");
  return {
    ten, boLoc: JSON.stringify(filter), hint: hint || null,
    soDoc: ds.length, dsId: ds.map(d => d._id),
    keHoach: dsStage(e.queryPlanner.winningPlan),
    nReturned: e.executionStats.nReturned,
    totalKeysExamined: e.executionStats.totalKeysExamined,
    totalDocsExamined: e.executionStats.totalDocsExamined
  };
}
function thu(ten, fn) {
  try { return fn(); } catch (e) { return { ten, loi: e.code, tenLoi: e.codeName, thongBao: String(e.message).slice(0, 400) }; }
}

col.drop();
col.insertMany([
  { _id: 1, maHV: "HV001" },
  { _id: 2, maHV: "HV002" },
  { _id: 3, maHV: "HV003", soDienThoai: null },
  { _id: 4, maHV: "HV004", soDienThoai: null },
  { _id: 5, maHV: "HV005", soDienThoai: "0901000001" },
  { _id: 6, maHV: "HV006", soDienThoai: "0901000002" }
]);
out.tongDocBanDau = col.countDocuments({});

const F = [
  ["$exists:true",  { soDienThoai: { $exists: true } }],
  ["$exists:false", { soDienThoai: { $exists: false } }],
  ["null",          { soDienThoai: null }]
];

out.truocKhiTaoIndex = F.map(([t, f]) => dem(t, f));
out.taoIndex = thu("createIndex", () =>
  col.createIndex({ soDienThoai: 1 }, { sparse: true, name: "idx_sdt_sparse" }));
out.cacChiMuc = col.getIndexes().map(i => ({ name: i.name, key: i.key, sparse: !!i.sparse }));
out.sauKhiTaoIndex_plannerTuChon = F.map(([t, f]) => dem(t, f));

const thuong = col.find({}).sort({ _id: 1 }).toArray().map(d => d._id);
const hinted = thu("hint", () => col.find({}).hint("idx_sdt_sparse").toArray().map(d => d._id).sort());
out.findRong = {
  thuong_soDoc: thuong.length, thuong_dsId: thuong,
  hint_soDoc: hinted.length, hint_dsId: hinted,
  docBiThieuKhiHint: thuong.filter(id => !hinted.includes(id))
};
out.epHint_moRong = F.map(([t, f]) => thu(t, () => dem(t + " + hint", f, "idx_sdt_sparse")));

print(JSON.stringify(out, null, 2));