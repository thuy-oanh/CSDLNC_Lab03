$uri = "mongodb://localhost:27017"
New-Item -ItemType Directory -Force -Path ketqua | Out-Null
foreach ($s in "step5_test_unique", "step6_test_sparse", "step7_test_sparse_unique") {
    Write-Host "== Chay $s"
    mongosh $uri --quiet --file "scripts/$s.js" | Out-File -Encoding utf8 "ketqua/$s.json"
}
Write-Host "Xong. Kiem tra lai thu muc ketqua/"