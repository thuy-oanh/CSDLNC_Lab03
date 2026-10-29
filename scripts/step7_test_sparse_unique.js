const col = db.getSiblingDB("lab03_indexing").test_sparse_unique;
const out = { buoc: "Buoc 7 - unique + sparse", mongodVersion: db.version(), thaoTac: [] };

function chay(ten, fn) {
  const r = { thaoTac: ten };
  try { r.chiTiet = fn(); r.ketQua = "THANH CONG"; }
  catch (e) {
    r.ketQua = "LOI"; r.maLoi = e.code; r.tenLoi = e.codeName;
    r.thongBao = String(e.message).slice(0, 400);
  }
  r.soDocSauThaoTac = col.countDocuments({});
  r.dsDoc = col.find({}).sort({ _id: 1 }).toArray().map(d =>
    d._id + ":" + (("soDienThoai" in d) ? JSON.stringify(d.soDienThoai) : "<thieu>"));
  r.cacChiMuc = col.getIndexes().map(i => i.name);
  out.thaoTac.push(r);
}
const SPEC = { soDienThoai: 1 }, OPT = { unique: true, sparse: true, name: "uq_sdt_sparse" };

chay("0. Reset + nap ban sao 6 document (2 thieu, 2 null, 2 chuoi)", () => {
  col.drop();
  return col.insertMany([
    { _id: 1, maHV: "HV001" },
    { _id: 2, maHV: "HV002" },
    { _id: 3, maHV: "HV003", soDienThoai: null },
    { _id: 4, maHV: "HV004", soDienThoai: null },
    { _id: 5, maHV: "HV005", soDienThoai: "0901000001" },
    { _id: 6, maHV: "HV006", soDienThoai: "0901000002" }
  ]).insertedIds;
});

chay("1. createIndex unique+sparse khi co 2 null (xung dot)", () => col.createIndex(SPEC, OPT));

chay("2. Xu ly xung dot: $unset soDienThoai o cac doc co gia tri null",
  () => col.updateMany({ soDienThoai: { $type: "null" } }, { $unset: { soDienThoai: "" } }));

chay("3. Tao lai unique+sparse index", () => col.createIndex(SPEC, OPT));

chay("4a. Them document THIEU truong (_id 7)",
  () => col.insertOne({ _id: 7, maHV: "HV007" }));
chay("4a'. Them them 1 document THIEU truong nua (_id 8)",
  () => col.insertOne({ _id: 8, maHV: "HV008" }));
chay("4b. Them document co soDienThoai: null (_id 9) - lan 1",
  () => col.insertOne({ _id: 9, maHV: "HV009", soDienThoai: null }));
chay("4b'. Them document co soDienThoai: null (_id 10) - lan 2",
  () => col.insertOne({ _id: 10, maHV: "HV010", soDienThoai: null }));
chay("4c. Them document LAP so dien thoai da co (0901000001) (_id 11)",
  () => col.insertOne({ _id: 11, maHV: "HV011", soDienThoai: "0901000001" }));

print(JSON.stringify(out, null, 2));