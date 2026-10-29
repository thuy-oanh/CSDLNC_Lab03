const col = db.getSiblingDB("lab03_indexing").test_unique;
const out = { buoc: "Buoc 5 - unique", mongodVersion: db.version(), thaoTac: [] };

function chay(ten, fn) {
  const r = { thaoTac: ten };
  try {
    const v = fn();
    r.ketQua = "THANH CONG";
    r.chiTiet = v;
  } catch (e) {
    r.ketQua = "LOI";
    r.maLoi = e.code;
    r.tenLoi = e.codeName;
    r.thongBao = String(e.message).slice(0, 400);
  }
  r.soDocSauThaoTac = col.countDocuments({});
  r.dsDoc = col.find({}).sort({ _id: 1 }).toArray().map(d =>
     d._id + ":" + (("email" in d) ? JSON.stringify(d.email) : "<thieu>"));
  r.cacChiMuc = col.getIndexes().map(i => i.name);
  out.thaoTac.push(r);
}

chay("0. Reset + nap 4 ho so (_id 1 va 3 cung email a@)", () => {
  col.drop();
  return col.insertMany([
    { _id: 1, maHV: "HV001", email: "a@example.test" },
    { _id: 2, maHV: "HV002", email: "b@example.test" },
    { _id: 3, maHV: "HV003", email: "a@example.test" },
    { _id: 4, maHV: "HV004", email: "c@example.test" }
  ]).insertedIds;
});

chay("1. createIndex({email:1},{unique:true}) khi dang co email trung",
  () => col.createIndex({ email: 1 }, { unique: true, name: "uq_email" }));

chay("2. Tim email trung (aggregate group)", () =>
  col.aggregate([
    { $group: { _id: "$email", soLan: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { soLan: { $gt: 1 } } }
  ]).toArray());

chay("3. Sua email cua _id 3 -> d@example.test",
  () => col.updateOne({ _id: 3 }, { $set: { email: "d@example.test" } }));

chay("4. Tao lai unique index uq_email",
  () => col.createIndex({ email: 1 }, { unique: true, name: "uq_email" }));

chay("5. insertOne email da ton tai (b@example.test)",
  () => col.insertOne({ _id: 5, maHV: "HV005", email: "b@example.test" }));

chay("6. insertOne email moi (f@example.test)",
  () => col.insertOne({ _id: 6, maHV: "HV006", email: "f@example.test" }));

chay("7. updateOne _id 4 -> email cua ho so khac (b@example.test)",
  () => col.updateOne({ _id: 4 }, { $set: { email: "b@example.test" } }));

chay("8. updateOne _id 4 -> g@example.test",
  () => col.updateOne({ _id: 4 }, { $set: { email: "g@example.test" } }));

chay("9a. (mo rong) insertOne thieu email lan 1",
  () => col.insertOne({ _id: 7, maHV: "HV007" }));
chay("9b. (mo rong) insertOne thieu email lan 2",
  () => col.insertOne({ _id: 8, maHV: "HV008" }));

print(JSON.stringify(out, null, 2));