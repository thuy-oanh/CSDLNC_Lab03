// scripts/seed.js
const conn = new Mongo();
const db = conn.getDB("lab03_indexing");

print("--- Dang lam sach collection hocvien ---");
db.hocvien.drop();

const TOTAL_RECORDS = 100000;
const BATCH_SIZE = 5000;

const cities = ["TP.HCM", "HaNoi", "DaNang", "CanTho", "HaiPhong"];
const districtsByCity = {
  "TP.HCM": ["Quan1", "Quan3", "Quan5", "Quan7", "Quan10", "BinhThanh", "ThuDuc"],
  "HaNoi": ["BaDinh", "HoanKiem", "CauGiay", "DongDa", "HaiBaTrung"],
  "DaNang": ["HaiChau", "ThanhKhe", "SonTra", "NguHanhSon"],
  "CanTho": ["NinhKieu", "BinhThuy", "CaiRang"],
  "HaiPhong": ["HongBang", "NgoQuyen", "LeChan"]
};

let batch = [];
let count = 0;

print("--- Bat dau sinh 100.000 documents ---");

for (let i = 1; i <= TOTAL_RECORDS; i++) {
  const maHV = "HV" + String(i).padStart(6, "0");
  const email = (i === 1) ? "hv000001@example.test" : `hv${String(i).padStart(6, "0")}@example.test`;
  const hoTen = `Hoc Vien ${i}`;

  let thanhPho, quan, hocBong;

  // Dam bao: >= 1.000 hoc vien o TP.HCM/Quan7, trong do >= 100 hoc vien co hocBong >= 1.000.000
  if (i <= 1000) {
    thanhPho = "TP.HCM";
    quan = "Quan7";
    hocBong = (i <= 200) ? (1000000 + (i % 10) * 500000) : ((i % 5) * 150000);
  } else {
    thanhPho = cities[i % cities.length];
    const listQuans = districtsByCity[thanhPho];
    quan = listQuans[i % listQuans.length];
    hocBong = (i % 7 === 0) ? (1000000 + (i % 10) * 500000) : ((i % 5) * 200000);
  }

  const doc = {
    maHV: maHV,
    hoTen: hoTen,
    email: email,
    diaChi: { thanhPho: thanhPho, quan: quan },
    hocBong: hocBong,
    ngayDangKy: new Date(2026, 0, (i % 28) + 1)
  };

  // Chia 3 truong hop: 1/3 chuoi hop le, 1/3 null, 1/3 thieu truong soDienThoai
  if (i % 3 === 0) {
    doc.soDienThoai = `09${String(i).padStart(8, "0")}`;
  } else if (i % 3 === 1) {
    doc.soDienThoai = null;
  }

  batch.push(doc);

  if (batch.length === BATCH_SIZE) {
    db.hocvien.insertMany(batch);
    count += batch.length;
    print(`Da nap: ${count}/${TOTAL_RECORDS}`);
    batch = [];
  }
}

if (batch.length > 0) {
  db.hocvien.insertMany(batch);
}

print("--- NAP HOAN TAT! KIEM TRA DIEU KIEN DE BAI ---");
print("Tong so doc:", db.hocvien.countDocuments());
print("TP.HCM/Quan7:", db.hocvien.countDocuments({ "diaChi.thanhPho": "TP.HCM", "diaChi.quan": "Quan7" }));
print("TP.HCM/Quan7 hoc bong >= 1tr:", db.hocvien.countDocuments({ "diaChi.thanhPho": "TP.HCM", "diaChi.quan": "Quan7", hocBong: { $gte: 1000000 } }));
print("Chi muc hien co (chi co _id_):", JSON.stringify(db.hocvien.getIndexes()));