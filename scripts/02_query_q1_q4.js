const conn = new Mongo();
const db = conn.getDB("lab03_indexing");
const fs = require("fs");

function resetIndexes() {
    db.hocvien.getIndexes().forEach(function (index) {
        if (index.name !== "_id_") {
            db.hocvien.dropIndex(index.name);
        }
    });

    printjson(db.hocvien.getIndexes());
}

function collectStages(stage, result) {
    if (!stage) return;

    if (stage.stage) result.push(stage.stage);
    if (stage.indexName) result.push("indexName=" + stage.indexName);

    if (stage.inputStage) collectStages(stage.inputStage, result);

    if (stage.inputStages) {
        stage.inputStages.forEach(function (item) {
            collectStages(item, result);
        });
    }

    if (stage.outerStage) collectStages(stage.outerStage, result);
    if (stage.innerStage) collectStages(stage.innerStage, result);

    if (stage.children) {
        stage.children.forEach(function (item) {
            collectStages(item, result);
        });
    }
}

function measureQuery(queryFn, testName) {
    queryFn().explain("executionStats");

    const times = [];
    let detailedExplain = null;

    for (let i = 0; i < 5; i++) {
        const result = queryFn().explain("executionStats");
        times.push(result.executionStats.executionTimeMillis);

        if (i === 0) detailedExplain = result;
    }

    const sortedTimes = times.slice().sort(function (a, b) {
        return a - b;
    });

    const execution = detailedExplain.executionStats;
    const stages = [];

    collectStages(execution.executionStages, stages);

    detailedExplain.measurement = {
        testName: testName,
        measuredTimesMs: times,
        sortedTimesMs: sortedTimes,
        medianTimeMs: sortedTimes[2],
        nReturned: execution.nReturned,
        totalKeysExamined: execution.totalKeysExamined,
        totalDocsExamined: execution.totalDocsExamined,
        executionTimeMillis: execution.executionTimeMillis,
        stages: stages
    };

    const outputPath = "ketqua/" + testName + ".json";

    try {
        fs.writeFileSync(outputPath, JSON.stringify(detailedExplain, null, 2));
        print("Da luu: " + outputPath);
    } catch (error) {
        print("Loi ghi JSON: " + error.message);
    }

    print("\n" + testName);
    print("nReturned: " + execution.nReturned);
    print("totalKeysExamined: " + execution.totalKeysExamined);
    print("totalDocsExamined: " + execution.totalDocsExamined);
    print("executionTimeMillis: " + execution.executionTimeMillis);
    print("5 lan do (ms): " + times.join(", "));
    print("Trung vi (ms): " + sortedTimes[2]);
    print("Stages: " + stages.join(" -> "));
}

if (db.hocvien.countDocuments({}) === 0) {
    throw new Error("Collection hocvien dang rong. Hay chay seed.js truoc.");
}

resetIndexes();

const queryQ1 = function () {
    return db.hocvien.find({
        email: "hv000001@example.test"
    });
};

measureQuery(queryQ1, "Q1_C0_only_id");

db.hocvien.createIndex({ email: 1 }, { name: "idx_email" });
measureQuery(queryQ1, "Q1_idx_email");
db.hocvien.dropIndex("idx_email");

const queryQ2 = function () {
    return db.hocvien.find({
        "diaChi.thanhPho": "TP.HCM",
        "diaChi.quan": "Quan7",
        hocBong: { $gte: 1000000 }
    }).sort({ hocBong: -1 });
};

measureQuery(queryQ2, "Q2_C0");

db.hocvien.createIndex(
    { "diaChi.thanhPho": 1 },
    { name: "C1" }
);
measureQuery(queryQ2, "Q2_C1");
db.hocvien.dropIndex("C1");

db.hocvien.createIndex(
    {
        "diaChi.thanhPho": 1,
        "diaChi.quan": 1
    },
    { name: "C2" }
);
measureQuery(queryQ2, "Q2_C2");
db.hocvien.dropIndex("C2");

db.hocvien.createIndex(
    {
        "diaChi.thanhPho": 1,
        "diaChi.quan": 1,
        hocBong: -1
    },
    { name: "C3" }
);
measureQuery(queryQ2, "Q2_C3");

const queryQ3 = function () {
    return db.hocvien.find({
        "diaChi.quan": "Quan7"
    });
};

measureQuery(queryQ3, "Q3_with_C3");
db.hocvien.dropIndex("C3");

db.hocvien.createIndex(
    { "diaChi.quan": 1 },
    { name: "idx_quan_single" }
);
measureQuery(queryQ3, "Q3_with_idx_quan_single");
db.hocvien.dropIndex("idx_quan_single");

db.hocvien.createIndex(
    {
        "diaChi.thanhPho": 1,
        "diaChi.quan": 1,
        hocBong: -1
    },
    { name: "C3" }
);

const queryQ4Covered = function () {
    return db.hocvien.find(
        {
            "diaChi.thanhPho": "TP.HCM",
            "diaChi.quan": "Quan7",
            hocBong: { $gte: 1000000 }
        },
        {
            "diaChi.thanhPho": 1,
            "diaChi.quan": 1,
            hocBong: 1,
            _id: 0
        }
    ).sort({ hocBong: -1 });
};

measureQuery(queryQ4Covered, "Q4_Covered");

const queryQ4Uncovered = function () {
    return db.hocvien.find(
        {
            "diaChi.thanhPho": "TP.HCM",
            "diaChi.quan": "Quan7",
            hocBong: { $gte: 1000000 }
        },
        {
            "diaChi.thanhPho": 1,
            "diaChi.quan": 1,
            hocBong: 1,
            hoTen: 1,
            _id: 0
        }
    ).sort({ hocBong: -1 });
};

measureQuery(queryQ4Uncovered, "Q4_hoTen_Uncovered");

print("\nHoan tat Q1 - Q4");
printjson(db.hocvien.getIndexes());