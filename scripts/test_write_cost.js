// scripts/test_write_cost.js

const dbName = "lab03_indexing";
use(dbName);

// Hàm tiện ích đo thời gian (trung vị của 5 lần chạy)
function measureExecutionTime(operationFunc, iterations = 5) {
    let times = [];
    for (let i = 0; i < iterations; i++) {
        let startTime = new Date();
        operationFunc();
        let endTime = new Date();
        times.push(endTime - startTime);
    }
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)]; // Trả về trung vị
}

// Hàm chuẩn bị 1000 document hợp lệ để insert
function generateInsertDocs() {
    let docs = [];
    for (let i = 0; i < 1000; i++) {
        docs.push({
            maHV: "HV_NEW_" + i,
            hoTen: "Hoc Vien Moi " + i,
            email: "hv_new_" + i + "@example.test",
            diaChi: { thanhPho: "TP.HCM", quan: "Quan1" },
            hocBong: 500000,
            ngayDangKy: new Date(),
            soDienThoai: "0900000" + i.toString().padStart(3, '0')
        });
    }
    return docs;
}

// 1. Chuẩn bị collection ghi_A và ghi_B
print("--- Chuẩn bị collection ghi_A và ghi_B ---");
db.ghi_A.drop();
db.ghi_B.drop();

// Sao chép dữ liệu từ hocvien sang ghi_A và ghi_B (Giả định 'hocvien' đã có 100k dòng do A chạy)
// Sử dụng aggregation với $out để copy dữ liệu nhanh chóng
db.hocvien.aggregate([{ $match: {} }, { $out: "ghi_A" }]);
db.hocvien.aggregate([{ $match: {} }, { $out: "ghi_B" }]);

print("Số lượng document trong ghi_A: " + db.ghi_A.countDocuments({}));
print("Số lượng document trong ghi_B: " + db.ghi_B.countDocuments({}));

// 2. Tạo chỉ mục cho ghi_B (ghi_A chỉ có _id_ mặc định)
print("--- Tạo chỉ mục cho ghi_B ---");
// unique email
db.ghi_B.createIndex({ email: 1 }, { name: "idx_email_unique", unique: true });
// Chỉ mục C3: { "diaChi.thanhPho": 1, "diaChi.quan": 1, hocBong: -1 }
db.ghi_B.createIndex({ "diaChi.thanhPho": 1, "diaChi.quan": 1, hocBong: -1 }, { name: "idx_C3" });
// sparse soDienThoai (không unique)
db.ghi_B.createIndex({ soDienThoai: 1 }, { name: "idx_sdt_sparse", sparse: true });

// 3. Lấy thông số indexSizes và totalIndexSize
let statsA = db.ghi_A.stats();
let statsB = db.ghi_B.stats();

print("\n--- Kích thước chỉ mục (Bytes) ---");
print("ghi_A totalIndexSize: " + statsA.totalIndexSize);
print("ghi_A indexSizes: ", statsA.indexSizes);
print("ghi_B totalIndexSize: " + statsB.totalIndexSize);
print("ghi_B indexSizes: ", statsB.indexSizes);

// 4. Đo thời gian INSERT
print("\n--- Đo thời gian INSERT 1000 document ---");
const insertDocs = generateInsertDocs();

let medianInsertA = measureExecutionTime(() => {
    // Không cần hoàn nguyên trước lượt đầu tiên vì ghi_A chưa có dữ liệu mới
    // (nhưng do yêu cầu "hoàn nguyên dữ liệu trước mỗi lượt", ta làm cho nhất quán)
    db.ghi_A.deleteMany({ maHV: { $regex: /^HV_NEW_/ } });
    db.ghi_A.insertMany(insertDocs);
});
print("Trung vị thời gian INSERT ghi_A: " + medianInsertA + " ms");

let medianInsertB = measureExecutionTime(() => {
    db.ghi_B.deleteMany({ maHV: { $regex: /^HV_NEW_/ } });
    db.ghi_B.insertMany(insertDocs);
});
print("Trung vị thời gian INSERT ghi_B: " + medianInsertB + " ms");

// (Dọn dẹp dữ liệu insert để chuẩn bị cho UPDATE, giữ nguyên bộ dữ liệu gốc)
db.ghi_A.deleteMany({ maHV: { $regex: /^HV_NEW_/ } });
db.ghi_B.deleteMany({ maHV: { $regex: /^HV_NEW_/ } });

// 5. Đo thời gian UPDATE
print("\n--- Đo thời gian UPDATE hocBong 1000 document qua _id ---");
// Lấy 1000 _id bất kỳ từ collection để update
let sampleDocs = db.ghi_A.find({}, { _id: 1 }).limit(1000).toArray();
let sampleIds = sampleDocs.map(doc => doc._id);

let medianUpdateA = measureExecutionTime(() => {
    // Hoàn nguyên học bổng (giả sử đặt về 0)
    db.ghi_A.updateMany({ _id: { $in: sampleIds } }, { $set: { hocBong: 0 } });
    // Bắt đầu cập nhật học bổng thực tế
    db.ghi_A.updateMany({ _id: { $in: sampleIds } }, { $set: { hocBong: 999999 } });
});
print("Trung vị thời gian UPDATE ghi_A: " + medianUpdateA + " ms");

let medianUpdateB = measureExecutionTime(() => {
    // Hoàn nguyên học bổng (giả sử đặt về 0)
    db.ghi_B.updateMany({ _id: { $in: sampleIds } }, { $set: { hocBong: 0 } });
    // Bắt đầu cập nhật học bổng thực tế
    db.ghi_B.updateMany({ _id: { $in: sampleIds } }, { $set: { hocBong: 999999 } });
});
print("Trung vị thời gian UPDATE ghi_B: " + medianUpdateB + " ms");