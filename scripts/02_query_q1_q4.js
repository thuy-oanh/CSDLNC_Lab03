// scripts/02_query_q1_q4.js
const conn = new Mongo();
const db = conn.getDB("lab03_indexing");
const fs = require("fs");

// Ham do thuc thi: warm-up 1 lan, do 5 lan lay trung vi
function measureQuery(queryFn, testName) {
  print(`\n======================================================`);
  print(`>>> Dang thuc hien do: ${testName} ...`);

  // 1. Chay warm-up 1 lan
  queryFn().explain("executionStats");

  const times = [];
  let detailedExplain = null;

  // 2. Chay do 5 lan lien tiep
  for (let i = 0; i < 5; i++) {
    const res = queryFn().explain("executionStats");
    times.push(res.executionStats.executionTimeMillis);
    if (i === 0) {
      detailedExplain = res;
    }
  }

  // 3. Tinh trung vi
  times.sort((a, b) => a - b);
  const medianTime = times[2];

  const exec = detailedExplain.executionStats;
  const stage = exec.executionStages.stage;

  // 4. Luu ket qua explain ra thu muc ketqua/
  const outputPath = `ketqua/${testName}.json`;
  try {
    fs.writeFileSync(outputPath, JSON.stringify(detailedExplain, null, 2));
    print(`[V] Da luu file: ${outputPath}`);
  } catch (err) {
    print(`[!] Chua ghi duoc file JSON (vui long kiem tra thu muc ketqua): ${err.message}`);
  }

  // In thong so de dien vao bao cao
  print(`--- SO LIEU DO: ${testName} ---`);
  print(`* Stage thang (Winning Stage) : ${stage}`);
  print(`* nReturned                  : ${exec.nReturned}`);
  print(`* totalKeysExamined          : ${exec.totalKeysExamined}`);
  print(`* totalDocsExamined          : ${exec.totalDocsExamined}`);
  print(`* Thoi gian 5 lan (ms)       : [${times.join(", ")}]`);
  print(`* TRUNG VI THOI GIAN         : ${medianTime} ms`);
}

print("=== BAT DAU DO DOC Q1 - Q4 ===");

// -------------------------------------------------------------
// 1. DO Q1: Tim email "hv000001@example.test"
// -------------------------------------------------------------
const queryQ1 = () => db.hocvien.find({ email: "hv000001@example.test" });

// 1.1 Chi co _id_
measureQuery(queryQ1, "Q1_C0_only_id");

// 1.2 Co idx_email
print("\n[+] Tao chi muc idx_email...");
db.hocvien.createIndex({ email: 1 }, { name: "idx_email" });
measureQuery(queryQ1, "Q1_idx_email");

// Xoa idx_email de khoi phuc ve mac dinh
db.hocvien.dropIndex("idx_email");
print("[-] Da xoa idx_email.");

// -------------------------------------------------------------
// 2. DO Q2: TP.HCM, Quan7, hocBong >= 1tr, sort hocBong giam dan
// -------------------------------------------------------------
const queryQ2 = () => db.hocvien.find({
  "diaChi.thanhPho": "TP.HCM",
  "diaChi.quan": "Quan7",
  hocBong: { $gte: 1000000 }
}).sort({ hocBong: -1 });

// C0: Chi co _id_
measureQuery(queryQ2, "Q2_C0");

// C1: { "diaChi.thanhPho": 1 }
db.hocvien.createIndex({ "diaChi.thanhPho": 1 }, { name: "C1" });
measureQuery(queryQ2, "Q2_C1");
db.hocvien.dropIndex("C1");

// C2: { "diaChi.thanhPho": 1, "diaChi.quan": 1 }
db.hocvien.createIndex({ "diaChi.thanhPho": 1, "diaChi.quan": 1 }, { name: "C2" });
measureQuery(queryQ2, "Q2_C2");
db.hocvien.dropIndex("C2");

// C3: { "diaChi.thanhPho": 1, "diaChi.quan": 1, hocBong: -1 }
db.hocvien.createIndex({ "diaChi.thanhPho": 1, "diaChi.quan": 1, hocBong: -1 }, { name: "C3" });
measureQuery(queryQ2, "Q2_C3");

// -------------------------------------------------------------
// 3. DO Q3: Tim diaChi.quan = "Quan7"
// -------------------------------------------------------------
const queryQ3 = () => db.hocvien.find({ "diaChi.quan": "Quan7" });

// Chay voi C3 dang co san
measureQuery(queryQ3, "Q3_with_C3");

// Tao chi muc don tren quan de so sanh
db.hocvien.createIndex({ "diaChi.quan": 1 }, { name: "idx_quan_single" });
measureQuery(queryQ3, "Q3_with_idx_quan_single");
db.hocvien.dropIndex("idx_quan_single");

// -------------------------------------------------------------
// 4. DO Q4: Covered Query va Uncovered Query (dung C3 dang ton tai)
// -------------------------------------------------------------
// Q4 Covered: chi lay cac truong da co san trong C3, loai _id
const queryQ4 = () => db.hocvien.find(
  {
    "diaChi.thanhPho": "TP.HCM",
    "diaChi.quan": "Quan7",
    hocBong: { $gte: 1000000 }
  },
  { "diaChi.thanhPho": 1, "diaChi.quan": 1, hocBong: 1, _id: 0 }
).sort({ hocBong: -1 });

measureQuery(queryQ4, "Q4_Covered");

// Q4 Uncovered: them hoTen vao projection
const queryQ4_hoTen = () => db.hocvien.find(
  {
    "diaChi.thanhPho": "TP.HCM",
    "diaChi.quan": "Quan7",
    hocBong: { $gte: 1000000 }
  },
  { "diaChi.thanhPho": 1, "diaChi.quan": 1, hocBong: 1, hoTen: 1, _id: 0 }
).sort({ hocBong: -1 });

measureQuery(queryQ4_hoTen, "Q4_hoTen_Uncovered");

print("\n=== HOAN TAT DO Q1 - Q4! ===");