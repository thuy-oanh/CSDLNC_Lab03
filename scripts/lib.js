// scripts/lib.js
const fs = require("fs");

function measureQuery(db, queryFn, testName) {
  print(`\n>>> Dang do: ${testName} ...`);

  // 1. Chay lam nong (warm-up) 1 lan (khong tinh thoi gian)
  queryFn().explain("executionStats");

  const times = [];
  let detailedExplain = null;

  // 2. Chay do 5 lan lien tiep
  for (let i = 0; i < 5; i++) {
    const res = queryFn().explain("executionStats");
    times.push(res.executionStats.executionTimeMillis);
    if (i === 0) {
      detailedExplain = res; // Luu lai cau truc cay thuc thi
    }
  }

  // 3. Tinh trung vi (lay phan tu o giua sau khi sort)
  times.sort((a, b) => a - b);
  const medianTime = times[2];

  const exec = detailedExplain.executionStats;
  const stage = exec.executionStages.stage;

  // 4. Luu ket qua explain ra file JSON trong thu muc ketqua/
  const outputPath = `ketqua/${testName}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(detailedExplain, null, 2));

  // In ket qua tom tat ra terminal de dien vao bao cao
  print(`-> Ket qua ${testName}:`);
  print(`   - nReturned: ${exec.nReturned}`);
  print(`   - totalKeysExamined: ${exec.totalKeysExamined}`);
  print(`   - totalDocsExamined: ${exec.totalDocsExamined}`);
  print(`   - executionTimeMillis 5 lan: [${times.join(", ")}]`);
  print(`   - TRUNG VI thoi gian: ${medianTime} ms`);
  print(`   - Winning Stage: ${stage}`);
  print(`   - Da xuat file: ${outputPath}`);

  return {
    testName,
    nReturned: exec.nReturned,
    totalKeysExamined: exec.totalKeysExamined,
    totalDocsExamined: exec.totalDocsExamined,
    medianTime,
    times,
    stage
  };
}

module.exports = { measureQuery };